import FireworksEngineDefault, {
    FireworksEngine,
    createFireworksEngine,
    resolveFireworksEnginePreset,
    type FireworksEngineOptions,
    type FireworksEngineCreationOptions,
    type FireworksBurstCallback,
    type FireworksBurstEvent,
    type FireworksEnginePresetName,
    type FireworksLaunchPresetName,
} from 'fireworks-engine';

const container = document.createElement('div');

const options: FireworksEngineOptions = {
    canvas: {
        appendTarget: container,
        maxDevicePixelRatio: 2,
        zIndex: 10,
    },
    runtime: {
        root: document.body,
        document,
        window,
        prefersReducedMotion: () => false,
        now: () => performance.now(),
    },
    mode: 'rocket',
    rocketCount: 2,
    rocketDelay: 180,
    totalDuration: 2200,
    timeScale: 1,
    sizeScale: 1,
    performance: {
        enableBurstQueueThrottling: true,
        maxBurstParticlesPerFrame: 120,
    },
    rocket: {
        enabled: true,
        colorMode: 'palette',
        palette: ['#ffd166', '#74c0fc'],
        cascade: {
            mode: 'rocket',
            bursts: 2,
            childBursts: 1,
            burst: {
                burstForms: {
                    shape: 'circle|square',
                    count: 24,
                },
            },
        },
    },
    rocketTailEmbers: {
        enabled: true,
        count: 8,
    },
    burstForms: {
        enabled: true,
        shape: 'glyph',
        glyph: '*',
        colorMode: 'single',
        singleColor: '#ffffff',
        spin: 0.4,
        spinCoverage: 0.5,
        spinDuration: 2,
        spinPause: 1.5,
        highlight: 0.25,
        highlightAngleDeg: 0,
        highlightWidth: 0.2,
    },
    burstSparks: {
        enabled: true,
        shape: 'fade',
        tailScale: 1.4,
    },
    burstCenterFlash: {
        enabled: true,
        colorMode: 'rgb',
    },
    burstTwinkleCloud: {
        enabled: true,
        count: 80,
    },
    onStart: (engine) => {
        engine.updateOptions({ timeScale: 1.1 });
    },
};

const engine = createFireworksEngine(options);
const explicitEngine = new FireworksEngine(options);
const defaultEngine = new FireworksEngineDefault(options);

const onBurst: FireworksBurstCallback = (event: FireworksBurstEvent) => {
    const position: [number, number] = [event.x, event.y];
    void position;
};
const creationOptions: FireworksEngineCreationOptions = { ...options, onBurst };
new FireworksEngine(creationOptions);
new FireworksEngineDefault({ onBurst });
createFireworksEngine({ onBurst });
// @ts-expect-error onBurst is constructor-only
engine.start({ onBurst });
// @ts-expect-error onBurst is constructor-only
engine.updateOptions({ onBurst });
// @ts-expect-error onBurst is constructor-only
engine.burst(10, 20, { onBurst });

const enginePresetName: FireworksEnginePresetName = 'finale';
const launchPresetName: FireworksLaunchPresetName = 'confetti-pop';

engine.start(resolveFireworksEnginePreset(enginePresetName));
engine.startPreset('base');
engine.launchRocket({ count: 2 });
engine.boom(120, 160);
engine.burst(120, 160, { rocket: { enabled: false } });
engine.confetti(120, 160);
engine.launchPresetAt(launchPresetName, 120, 160);
engine.launchRocketAt(120, 160);
engine.launchRocketFromTo(20, 400, 120, 160);
engine.stop(false);
engine.destroy();
explicitEngine.destroy();
defaultEngine.destroy();
