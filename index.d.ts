export type HexColorString = `#${string}`;

export type FireworksEnginePresetName = 'base' | 'rocket' | 'cascade' | 'finale';
export type FireworksLaunchPresetName =
    | 'button-click'
    | 'success-burst'
    | 'win-celebration'
    | 'achievement-unlock'
    | 'confetti-pop'
    | 'purchase-success'
    | 'victory-finale'
    | 'snowfall'
    | 'leaf-fall'
    | 'ambient-sparkle';
export type FireworksMode = 'burst' | 'rocket';
export type RocketCascadeMode = 'burst' | 'rocket';
export type BurstColorMode = 'palette' | 'rgb' | 'single';
export type BurstFlashColorMode = 'palette' | 'rgb' | 'single';
export type BurstFormPrimitiveShape = 'circle' | 'square' | 'rectangle' | 'glyph';
export type BurstFormShape = BurstFormPrimitiveShape | 'mix';
export type BurstFormShapeInput = BurstFormShape | `${BurstFormShape}|${string}`;
export type BurstSparkShape = 'uniform' | 'spindle' | 'fade';

export type FireworksTimeoutHandle = ReturnType<typeof globalThis.setTimeout>;
export type FireworksRequestAnimationFrame = (callback: FrameRequestCallback) => number;
export type FireworksCancelAnimationFrame = (handle: number) => void;
export type FireworksLifecycleCallback = (engine: FireworksEngine) => void;

export interface FireworksRootResolverContext {
    document: Document | null;
    window: Window | null;
}

export type FireworksRootResolver = (
    context: FireworksRootResolverContext,
) => Element | null | undefined;

export interface FireworksCanvasOptions {
    appendTarget?: Element | null;
    maxDevicePixelRatio?: number;
    zIndex?: number | string;
}

export interface FireworksRuntimeOptions {
    document?: Document | null;
    window?: Window | null;
    root?: Element | FireworksRootResolver | null;
    prefersReducedMotion?: (() => boolean) | null;
    requestAnimationFrame?: FireworksRequestAnimationFrame | null;
    cancelAnimationFrame?: FireworksCancelAnimationFrame | null;
    setTimeout?: typeof globalThis.setTimeout | null;
    clearTimeout?: typeof globalThis.clearTimeout | null;
    now?: (() => number) | null;
}

export interface FireworksPerformanceOptions {
    enableBurstQueueThrottling?: boolean;
    maxBurstParticlesPerFrame?: number;
    particlePressureThreshold?: number;
    fastRectRadiusThreshold?: number;
}

export interface FireworksRocketCascadeOptions {
    mode?: RocketCascadeMode;
    bursts?: number;
    childBursts?: number;
    childSpeedMin?: number;
    childSpeedMax?: number;
    childDurationMin?: number;
    childDurationMax?: number;
    childDirectionDeg?: number;
    childConeDeg?: number;
    delay?: number;
    spreadX?: number;
    spreadY?: number;
    burst?: FireworksBurstOverrideOptions;
    child?: FireworksRocketLaunchOptions;
}

export interface FireworksRocketOptions {
    enabled?: boolean;
    colorMode?: BurstColorMode;
    singleColor?: HexColorString | string;
    palette?: string[] | readonly string[];
    color?: HexColorString | string;
    streakLength?: number;
    finalStreakLength?: number;
    thickness?: number;
    speed?: number;
    durationMin?: number;
    durationMax?: number;
    cascade?: FireworksRocketCascadeOptions;
}

export interface FireworksRocketTailEmbersOptions {
    enabled?: boolean;
    count?: number;
    brightness?: number;
    fade?: number;
    spreadX?: number;
    spreadY?: number;
    speed?: number;
    size?: number;
}

export interface FireworksBurstFormsOptions {
    enabled?: boolean;
    palette?: string[] | readonly string[];
    count?: number;
    speedMin?: number;
    speedMax?: number;
    directionDeg?: number;
    coneDeg?: number;
    gravity?: number;
    lifeMin?: number;
    lifeMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    spin?: number;
    spinCoverage?: number;
    spinDuration?: number;
    spinPause?: number;
    highlight?: number;
    highlightAngleDeg?: number;
    highlightWidth?: number;
    wobble?: number;
    shape?: BurstFormShapeInput;
    glyph?: string;
    colorMode?: BurstColorMode;
    singleColor?: HexColorString | string;
}

export interface FireworksBurstSparksOptions {
    enabled?: boolean;
    palette?: string[] | readonly string[];
    count?: number;
    length?: number;
    tailScale?: number;
    thickness?: number;
    speedMin?: number;
    speedMax?: number;
    directionDeg?: number;
    coneDeg?: number;
    gravity?: number;
    lifeMin?: number;
    lifeMax?: number;
    shape?: BurstSparkShape;
    colorMode?: BurstColorMode;
    singleColor?: HexColorString | string;
}

export interface FireworksBurstCenterFlashOptions {
    enabled?: boolean;
    startSize?: number;
    endSize?: number;
    peakAlpha?: number;
    attack?: number;
    fade?: number;
    colorMode?: BurstFlashColorMode;
    color?: HexColorString | string;
    innerStop?: number;
}

export interface FireworksBurstTwinkleCloudOptions {
    enabled?: boolean;
    count?: number;
    radius?: number;
    startDelay?: number;
    duration?: number;
    twinkleLife?: number;
    brightness?: number;
    size?: number;
    spawnSpread?: number;
}

export interface FireworksBurstOverrideOptions {
    timeScale?: number;
    sizeScale?: number;
    simple?: boolean;
    burstForms?: FireworksBurstFormsOptions;
    burstSparks?: FireworksBurstSparksOptions;
    burstCenterFlash?: FireworksBurstCenterFlashOptions;
    burstTwinkleCloud?: FireworksBurstTwinkleCloudOptions;
}

export interface FireworksRocketLaunchOptions extends FireworksBurstOverrideOptions {
    count?: number;
    rocket?: FireworksRocketOptions;
    rocketTailEmbers?: FireworksRocketTailEmbersOptions;
}

export interface FireworksBurstEvent {
    x: number;
    y: number;
    /** Present only for an opted-in, supported victory-finale launch. */
    sequence?: {
        /** Opaque identity, unique per launch within this engine. */
        id: symbol;
        index: number;
        isFirst: boolean;
        isLast: boolean;
    };
}

export interface FireworksPresetLaunchOptions extends FireworksRocketLaunchOptions {
    /** Only victory-finale with count=1, sizeScale=1.05, timeScale=0.95 and
     * default effective visual/performance engine configuration is supported.
     * Unsupported tracking requests return false before launch side effects.
     * Changing that configuration during a launch interrupts its tracking.
     */
    trackBurstSequence?: boolean;
}

export type FireworksBurstCallback = (event: FireworksBurstEvent) => void;

/** Options accepted only when creating an engine. */
export interface FireworksEngineCreationOptions extends FireworksEngineOptions {
    onBurst?: FireworksBurstCallback | null;
}

export interface FireworksEngineOptions extends FireworksRocketLaunchOptions {
    canvas?: FireworksCanvasOptions;
    runtime?: FireworksRuntimeOptions;
    performance?: FireworksPerformanceOptions;
    mode?: FireworksMode;
    bursts?: number;
    duration?: number;
    rocketCount?: number;
    rocketDelay?: number;
    totalDuration?: number;
    onStart?: FireworksLifecycleCallback | null;
    onStop?: FireworksLifecycleCallback | null;
    onFinish?: FireworksLifecycleCallback | null;
}

export interface ResolvedRocketConfig {
    enabled: boolean;
    colorMode: BurstColorMode;
    singleColor: string;
    palette: string[] | readonly string[] | null;
    streakLength: number;
    finalStreakLength: number;
    thickness: number;
    speed: number;
}

export interface ResolvedRocketTailEmbersConfig {
    enabled: boolean;
    count: number;
    brightness: number;
    fade: number;
    spreadX: number;
    spreadY: number;
    speed: number;
    size: number;
}

export interface ResolvedBurstFormsConfig {
    enabled: boolean;
    count: number;
    speedMin: number;
    speedMax: number;
    directionDeg: number;
    coneDeg: number;
    gravity: number;
    lifeMin: number;
    lifeMax: number;
    sizeMin: number;
    sizeMax: number;
    spin: number;
    spinCoverage: number;
    spinDuration: number;
    spinPause: number;
    highlight: number;
    highlightAngleDeg: number;
    highlightWidth: number;
    wobble: number;
    palette: string[] | readonly string[];
    simple?: boolean;
    shape: BurstFormShapeInput;
    glyph: string;
    colorMode: BurstColorMode;
    singleColor: string;
}

export interface ResolvedBurstSparksConfig {
    enabled: boolean;
    count: number;
    speedMin: number;
    speedMax: number;
    directionDeg: number;
    coneDeg: number;
    gravity: number;
    lifeMin: number;
    lifeMax: number;
    palette: string[] | readonly string[];
    simple?: boolean;
    length: number;
    tailScale: number;
    thickness: number;
    shape: BurstSparkShape;
    colorMode: BurstColorMode;
    singleColor: string;
}

export interface ResolvedBurstCenterFlashConfig {
    enabled: boolean;
    startSize: number;
    endSize: number;
    peakAlpha: number;
    attack: number;
    fade: number;
    colorMode: BurstFlashColorMode;
    color: string;
    innerStop: number;
}

export interface ResolvedBurstTwinkleCloudConfig {
    enabled: boolean;
    count: number;
    radius: number;
    startDelay: number;
    duration: number;
    twinkleLife: number;
    brightness: number;
    size: number;
    spawnSpread: number;
}

export interface ResolvedPerformanceConfig {
    enableBurstQueueThrottling: boolean;
    maxBurstParticlesPerFrame: number;
    particlePressureThreshold: number;
    fastRectRadiusThreshold: number;
}

export interface ResolvedBurstOptions {
    sizeScale: number;
    simple: boolean;
    burstForms: ResolvedBurstFormsConfig;
    burstSparks: ResolvedBurstSparksConfig;
    burstCenterFlash: ResolvedBurstCenterFlashConfig;
    burstTwinkleCloud: ResolvedBurstTwinkleCloudConfig;
}

export interface FireworksFormParticle {
    type: 'form';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    life: number;
    maxLife: number;
    radius: number;
    color: string;
    drag: number;
    simple?: boolean;
    formShape: BurstFormPrimitiveShape;
    formGlyph: string;
    formSpin: number;
    formSpinPhase: number;
    formSpinPhaseSpeed: number;
    formSpinAngle: number;
    formSpinAngleSpeed: number;
    formSpinMinWidthScale: number;
    formSpinFlipExponent: number;
    formSpinRateWavePhase: number;
    formSpinRateWaveSpeed: number;
    formSpinRateWaveAmplitude: number;
    formWidthScale: number;
    formWobble: number;
    formWobbleLateralSpeed: number;
    formWobbleVelocity: number;
    formWobbleTarget: number;
    formWobbleTargetTimer: number;
}

export interface FireworksBurstSparkParticle {
    type: 'burstSpark';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    life: number;
    maxLife: number;
    color: string;
    drag: number;
    simple?: boolean;
    sparkLength: number;
    sparkTailScale: number;
    sparkThickness: number;
    initialSpeed: number;
    sparkShape: BurstSparkShape;
}

export interface FireworksRocketEmberParticle {
    type: 'rocketEmber';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    life: number;
    maxLife: number;
    radius: number;
    brightness: number;
    drag: number;
    simple?: boolean;
}

export type FireworksParticle =
    | FireworksFormParticle
    | FireworksBurstSparkParticle
    | FireworksRocketEmberParticle;

export interface FireworksTwinkle {
    x: number;
    y: number;
    appearAt: number;
    life: number;
    size: number;
    alphaScale: number;
}

export interface FireworksBurstFlash {
    type: 'burstFlash';
    x: number;
    y: number;
    age: number;
    life: number;
    maxLife: number;
    startSize: number;
    endSize: number;
    peakAlpha: number;
    attack: number;
    fade: number;
    color: string;
    innerStop: number;
}

export interface FireworksBurstTwinkleCloud {
    type: 'burstTwinkleCloud';
    x: number;
    y: number;
    age: number;
    maxLife: number;
    startDelay: number;
    duration: number;
    twinkleLife: number;
    radius: number;
    brightness: number;
    size: number;
    spawnSpread: number;
    twinkles: FireworksTwinkle[];
}

export interface FireworksRocketTailEmbersState {
    enabled: boolean;
    count: number;
    brightness: number;
    fade: number;
    spreadX: number;
    spreadY: number;
    speed: number;
    size: number;
}

export interface FireworksRocketCascadeState {
    mode: RocketCascadeMode;
    bursts: number;
    childBursts: number;
    childSpeedMin: number | null;
    childSpeedMax: number | null;
    childDurationMin: number | null;
    childDurationMax: number | null;
    childDirectionDeg: number;
    childConeDeg: number;
    delay: number;
    spreadX: number;
    spreadY: number;
    burst: ResolvedBurstOptions;
    child: FireworksRocketLaunchOptions | null;
}

export interface FireworksRocket {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    totalDx: number;
    totalDy: number;
    totalDistanceSq: number;
    hasExplicitTarget: boolean;
    hasExplicitStart: boolean;
    vx: number;
    vy: number;
    travelSpeed: number;
    life: number;
    maxLife: number;
    color: string;
    directionX: number;
    directionY: number;
    rotationAngle: number;
    sparkLength: number;
    sparkFinalLength: number;
    thickness: number;
    trailTimer: number;
    tailEmberAccumulator: number;
    tailEmbers: FireworksRocketTailEmbersState;
    burst: ResolvedBurstOptions;
    cascade: FireworksRocketCascadeState;
    simple: boolean;
}

export interface FireworksBurstRequest {
    x: number;
    y: number;
    options: ResolvedBurstOptions;
    flashOptions: ResolvedBurstOptions | FireworksBurstOverrideOptions;
    layer: 'burstForm' | 'burstSpark';
    totalCount: number;
    nextIndex: number;
    spawnBurstCenterFlash: boolean;
    spawnBurstTwinkleCloud: boolean;
    flashSpawned: boolean;
    twinkleCloudSpawned: boolean;
}

export interface FireworksPresetConfig extends FireworksEngineOptions { }

export declare class FireworksEngine {
    constructor(options?: FireworksEngineCreationOptions);

    documentRef: Document | null | undefined;
    windowRef: Window | null | undefined;
    rootRef: Element | FireworksRootResolver | null | undefined;
    prefersReducedMotionRef: (() => boolean) | null | undefined;
    requestAnimationFrameRef: FireworksRequestAnimationFrame | null | undefined;
    cancelAnimationFrameRef: FireworksCancelAnimationFrame | null | undefined;
    setTimeoutRef: typeof globalThis.setTimeout | null | undefined;
    clearTimeoutRef: typeof globalThis.clearTimeout | null | undefined;
    nowRef: (() => number) | null | undefined;
    maxDevicePixelRatio: number;
    canvasZIndex: number | string;

    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    dpr: number;

    particles: FireworksParticle[];
    formPool: Array<Partial<FireworksFormParticle>>;
    sparkPool: Array<Partial<FireworksBurstSparkParticle>>;
    emberPool: Array<Partial<FireworksRocketEmberParticle>>;
    spriteCache: Map<string, HTMLCanvasElement>;
    rockets: FireworksRocket[];
    flashes: FireworksBurstFlash[];
    twinkleClouds: FireworksBurstTwinkleCloud[];
    burstQueue: FireworksBurstRequest[];
    running: boolean;
    rafId: number | null;
    loopFrame: (now: number) => void;
    lastTime: number;
    timeoutIds: Set<FireworksTimeoutHandle>;
    pendingStartConfig: FireworksEngineOptions | null;
    hasResizeListener: boolean;
    hasDomReadyListener: boolean;
    defaultLifecycleHooks: {
        onStart: FireworksLifecycleCallback | null;
        onStop: FireworksLifecycleCallback | null;
        onFinish: FireworksLifecycleCallback | null;
    };
    activeLifecycleHooks: {
        onStart: FireworksLifecycleCallback | null;
        onStop: FireworksLifecycleCallback | null;
        onFinish: FireworksLifecycleCallback | null;
    };
    finishLifecycleNotified: boolean;

    enableBurstQueueThrottling: boolean;
    timeScale: number;
    sizeScale: number;

    rocket: ResolvedRocketConfig;
    rocketTailEmbers: ResolvedRocketTailEmbersConfig;
    burstForms: ResolvedBurstFormsConfig;
    burstSparks: ResolvedBurstSparksConfig;
    burstCenterFlash: ResolvedBurstCenterFlashConfig;
    burstTwinkleCloud: ResolvedBurstTwinkleCloudConfig;
    performance: ResolvedPerformanceConfig;
    maxBurstParticlesPerFrame: number;
    particlePressureThreshold: number;
    fastRectRadiusThreshold: number;
    renderPressureMode: boolean;

    /** @internal */
    resize(): void;

    /**
     * Launches one or more rockets using the configured launch behavior.
     * @param options Launch overrides applied to every rocket in the batch.
     */
    launchRocket(options?: FireworksRocketLaunchOptions): void;
    /**
     * Alias of `launchRocketAt`.
     * @param x Target X coordinate in canvas pixels.
     * @param y Target Y coordinate in canvas pixels.
     * @param options Optional launch overrides.
     */
    boom(x: number, y: number, options?: FireworksRocketLaunchOptions): boolean;
    /**
     * Triggers a burst at the given point without showing a rocket trail.
     * @param x Target X coordinate in canvas pixels.
     * @param y Target Y coordinate in canvas pixels.
     * @param options Optional launch overrides.
     */
    burst(x: number, y: number, options?: FireworksRocketLaunchOptions): boolean;
    /**
     * Convenience wrapper around `burst` with confetti defaults.
     * @param x Target X coordinate in canvas pixels.
     * @param y Target Y coordinate in canvas pixels.
     * @param options Optional confetti overrides.
     */
    confetti(x: number, y: number, options?: FireworksRocketLaunchOptions): boolean;
    /**
     * Updates the engine configuration in place.
     * @param options Partial engine configuration to merge into the current runtime state.
     */
    updateOptions(options?: FireworksEngineOptions): void;
    /**
     * Launches a rocket toward the given target point.
     * @param targetX Target X coordinate in canvas pixels.
     * @param targetY Target Y coordinate in canvas pixels.
     * @param options Optional launch overrides.
     */
    launchRocketAt(targetX: number, targetY: number, options?: FireworksRocketLaunchOptions): boolean;
    /**
     * Launches a named preset toward the given target point.
     * Burst-mode presets fire as direct bursts; rocket-mode presets keep their rocket flight.
     * @param name Preset name to resolve before launching.
     * @param targetX Target X coordinate in canvas pixels.
     * @param targetY Target Y coordinate in canvas pixels.
     * @param options Optional launch overrides that merge with the preset.
     */
    launchPresetAt(
        name: FireworksEnginePresetName | FireworksLaunchPresetName | string,
        targetX: number,
        targetY: number,
        options?: FireworksPresetLaunchOptions,
    ): boolean;
    /**
     * Launches a rocket from a specific start point toward a target point.
     * @param startX Rocket start X coordinate in canvas pixels.
     * @param startY Rocket start Y coordinate in canvas pixels.
     * @param targetX Target X coordinate in canvas pixels.
     * @param targetY Target Y coordinate in canvas pixels.
     * @param options Optional launch overrides.
     */
    launchRocketFromTo(
        startX: number,
        startY: number,
        targetX: number,
        targetY: number,
        options?: FireworksRocketLaunchOptions,
    ): boolean;
    /** @internal */
    finishWhenDone(): void;

    /**
     * Starts the engine with the provided options.
     * @param config Optional engine configuration used for this start call.
     */
    start(config?: FireworksEngineOptions): boolean;
    /**
     * Starts the engine using a named preset.
     * @param name Preset name to resolve before starting the engine.
     */
    startPreset(name?: FireworksEnginePresetName | string): boolean;
    /**
     * Stops the engine. Optionally clears the canvas.
     * @param clearCanvas When true, clears the current canvas before stopping.
     */
    stop(clearCanvas?: boolean): void;
    /**
     * Stops the engine and releases DOM/runtime resources.
     */
    destroy(): void;
}

export interface FireworksRocketExplicitTarget {
    x: number;
    y: number;
    startX?: number;
    startY?: number;
}

/**
 * Creates a new fireworks engine instance.
 * @param options Initial engine configuration.
 * @returns A new fireworks engine instance.
 */
export declare function createFireworksEngine(options?: FireworksEngineCreationOptions): FireworksEngine;

/**
 * Resolves a preset name to a fully expanded engine configuration.
 * @param name Preset name to resolve.
 * @returns The resolved preset configuration.
 */
export declare function resolveFireworksEnginePreset(
    name?: FireworksEnginePresetName | string,
): FireworksPresetConfig;

export default FireworksEngine;
