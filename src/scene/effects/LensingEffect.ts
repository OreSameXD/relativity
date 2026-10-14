import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Uniform, Vector2, type WebGLRenderer, type WebGLRenderTarget } from 'three';

/** Параметры линзы, которые эффект читает каждый кадр. */
export interface LensParams {
  /** Положение чёрной дыры в UV экрана, 0..1, y вверх */
  x: number;
  y: number;
  /** 0..1 — выкл/вкл эффекта */
  strength: number;
  /** Радиус Эйнштейна в долях высоты кадра */
  radius: number;
}

/**
 * Гравитационная линза как пост-эффект поверх реального звёздного поля.
 * Модель: тонкая линза точечной массы в слабом поле, beta = theta - thetaE^2 / theta.
 * Тень и фотонное кольцо нарисованы декоративно (упрощено).
 */
const fragment = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uStrength <= 0.001) { outputColor = inputColor; return; }

  vec2 d = uv - uCenter;
  d.x *= uAspect;
  float r = length(d);
  float rE = uRadius;
  float rs = rE * 0.38;

  // Тонкая линза: положение источника для наблюдаемого положения
  float f = 1.0 - (rE * rE) / max(r * r, 1e-6);
  vec2 src = d * f;
  src.x /= uAspect;
  vec2 suv = mix(uv, uCenter + src, uStrength);

  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  vec4 c = texture2D(inputBuffer, clamp(suv, 0.0, 1.0));
  c.rgb *= inside;

  // Тень чёрной дыры
  float shadow = smoothstep(rs, rs * 1.07, r);
  // Фотонное кольцо: тонкое, яркое, HDR для bloom, плюс мягкое свечение вокруг
  float ring = exp(-pow((r - rs * 1.1) / (rs * 0.07), 2.0)) + exp(-pow((r - rs * 1.1) / (rs * 0.3), 2.0)) * 0.12;
  // Слабое гало у радиуса Эйнштейна
  float halo = exp(-pow((r - rE) / (rE * 0.3), 2.0)) * 0.12;

  vec3 ringCol = vec3(1.0, 0.86, 0.66) * 2.6;
  vec3 haloCol = vec3(0.6, 0.55, 1.0);
  vec3 col = c.rgb * shadow + (ring * ringCol + halo * haloCol) * uStrength * shadow;

  outputColor = vec4(mix(inputColor.rgb, col, uStrength), 1.0);
}
`;

export class LensingEffect extends Effect {
  private center = new Vector2(0.5, 0.5);
  private params: LensParams = { x: 0.5, y: 0.5, strength: 0, radius: 0.18 };

  /**
   * @param source читает актуальные параметры (store истории или локальное состояние интерактива);
   *               пишет в переданный объект и возвращает его, чтобы не выделять память каждый кадр.
   */
  constructor(private readonly source: (out: LensParams) => LensParams) {
    super('LensingEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uCenter', new Uniform(new Vector2(0.5, 0.5))],
        ['uRadius', new Uniform(0.18)],
        ['uStrength', new Uniform(0)],
        ['uAspect', new Uniform(1)],
      ]),
    });
  }

  override update(_renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number): void {
    const p = this.source(this.params);
    const dt = deltaTime ?? 0.016;
    const k = 1 - Math.exp(-dt * 7);
    this.center.x += (p.x - this.center.x) * k;
    this.center.y += (p.y - this.center.y) * k;

    const u = this.uniforms;
    (u.get('uCenter')!.value as Vector2).copy(this.center);
    u.get('uRadius')!.value = p.radius;
    u.get('uStrength')!.value = p.strength;
    u.get('uAspect')!.value = inputBuffer.width / Math.max(1, inputBuffer.height);
  }
}
