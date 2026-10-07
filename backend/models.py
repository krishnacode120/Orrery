from typing import Annotated, Literal, Any
import math
from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

Vec3 = tuple[FiniteFloat, FiniteFloat, FiniteFloat]
Color = Annotated[str, Field(pattern=r'^#[0-9a-fA-F]{6}$')]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class Spin(StrictModel):
    axis: Vec3
    period: FiniteFloat

    @model_validator(mode='after')
    def nonzero(self):
        if self.period == 0:
            raise ValueError('Spin period cannot be zero')
        return self


class Atmosphere(StrictModel):
    density: FiniteFloat = Field(ge=0)
    color: Color
    height: FiniteFloat = Field(ge=0)


class Rings(StrictModel):
    inner: FiniteFloat = Field(gt=0)
    outer: FiniteFloat = Field(gt=0)
    opacity: FiniteFloat = Field(ge=0, le=1)
    texture: str | None

    @model_validator(mode='after')
    def ordered(self):
        if self.outer <= self.inner:
            raise ValueError('Ring outer radius must exceed inner radius')
        return self


class Trail(StrictModel):
    length: FiniteFloat = Field(ge=0)
    color: Color
    mode: Literal['history','orbit'] = 'history'
    width: FiniteFloat = Field(default=1, ge=0.1, le=8)
    duration: FiniteFloat = Field(default=31557600, ge=0, le=1e12)



class ConfigBlock(BaseModel):
    model_config = ConfigDict(extra='allow', allow_inf_nan=False)

class EngineStage(ConfigBlock):
    name: str = Field(max_length=120)
    dryMass: FiniteFloat = Field(gt=0)
    fuel: FiniteFloat = Field(ge=0)
    capacity: FiniteFloat = Field(gt=0)
    thrust: FiniteFloat = Field(gt=0)
    isp: FiniteFloat = Field(gt=0)

class RocketConfig(ConfigBlock):
    stages: list[EngineStage] = Field(min_length=1,max_length=8)
    stage: int = Field(ge=0,le=7)
    payloadMass: FiniteFloat = Field(ge=0)
    throttle: FiniteFloat = Field(ge=0,le=1)
    targetAltitude: FiniteFloat = Field(ge=100000,le=1e8)
    area: FiniteFloat = Field(gt=0)
    cd: FiniteFloat = Field(ge=0)
    orientation: Vec3
    met: FiniteFloat = Field(ge=0)
    phase: str = Field(max_length=80)
    engineOn: bool
    autopilot: bool
    autoStage: bool

class SpacecraftConfig(ConfigBlock):
    range: FiniteFloat = Field(gt=0)
    battery: FiniteFloat = Field(ge=0,le=1)
    capacityWh: FiniteFloat = Field(gt=0)
    solarWatts: FiniteFloat = Field(ge=0)
    loadWatts: FiniteFloat = Field(ge=0)
    orientation: Vec3
    epochJD: FiniteFloat
    payload: Literal['standby','active','off']

class WormholeConfig(ConfigBlock):
    pairId: str = Field(min_length=1,max_length=80)
    throatRadius: FiniteFloat = Field(gt=0,le=1e18)
    orientation: tuple[FiniteFloat,FiniteFloat,FiniteFloat,FiniteFloat]
    cooldown: FiniteFloat = Field(ge=.01)
    transformVelocity: bool

class HoleConfig(ConfigBlock):
    diskSize: FiniteFloat = Field(ge=3,le=1000)
    temperature: FiniteFloat = Field(gt=0)
    accretedMass: FiniteFloat = Field(default=0,ge=0)

class Maneuver(ConfigBlock):
    id: str = Field(min_length=1,max_length=80)
    bodyId: str = Field(min_length=1,max_length=80)
    jd: FiniteFloat = Field(ge=2378496.5,lt=2470172.5)
    direction: Literal['prograde','retrograde','in','out','normal','antinormal','vector']
    deltaV: FiniteFloat = Field(ge=0,le=1e7)
    vector: Vec3
    executed: bool

class Station(ConfigBlock):
    id: str = Field(min_length=1,max_length=80)
    name: str = Field(min_length=1,max_length=120)
    bodyId: str = Field(min_length=1,max_length=80)
    latitude: FiniteFloat = Field(ge=-90,le=90)
    longitude: FiniteFloat = Field(ge=-180,le=180)
    altitude: FiniteFloat = Field(default=0,ge=0)

class CameraState(ConfigBlock):
    position: Vec3
    target: Vec3
    scale: Literal['system','planetary','earth','vehicle','true']


class Body(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    type: Literal['star', 'planet', 'moon', 'dwarf', 'asteroid', 'comet',
                  'neutronStar', 'pulsar', 'whiteDwarf', 'blackHole',
                  'wormholeMouth', 'rogue', 'spacecraft', 'satellite', 'rocket', 'custom']
    mass: FiniteFloat = Field(ge=0, le=1e40)
    radius: FiniteFloat = Field(gt=0, le=1e18)
    density: FiniteFloat | None = Field(default=None, gt=0)
    position: Vec3
    velocity: Vec3
    spin: Spin
    axialTilt: FiniteFloat
    color: Color
    texture: str | None
    material: str = Field(max_length=80)
    temperature: FiniteFloat = Field(ge=0)
    luminosity: FiniteFloat = Field(ge=0)
    albedo: FiniteFloat = Field(ge=0, le=1)
    atmosphere: Atmosphere | None
    rings: Rings | None
    trail: Trail
    locked: bool
    massless: bool
    parentId: str | None
    createdAt: str = Field(max_length=64)
    collisionMode: Literal['inherit', 'none', 'merge', 'bounce', 'fragment'] = 'inherit'
    disrupted: bool = False
    visible: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    blackHole: dict[str, Any] | None = None
    wormhole: dict[str, Any] | None = None
    rocket: dict[str, Any] | None = None
    spacecraft: dict[str, Any] | None = None
    acceleration: Vec3 | None = None
    portalCooldownJD: FiniteFloat | None = None

    @model_validator(mode='after')
    def bounded_vectors(self):
        if any(abs(x) > 1e20 for x in self.position) or any(abs(x) > 1e12 for x in self.velocity):
            raise ValueError('State vectors exceed supported limits')
        if self.rocket:
            RocketConfig.model_validate(self.rocket)
            r = self.rocket
            stages = r.get('stages', [])
            if not 1 <= len(stages) <= 8 or not 0 <= r.get('stage', -1) < len(stages):
                raise ValueError('Invalid rocket stages')
            if not 0 <= r.get('throttle', -1) <= 1 or r.get('payloadMass', -1) < 0:
                raise ValueError('Invalid rocket throttle/mass')
            for stage in stages:
                if not (stage.get('dryMass', 0) > 0 and 0 <= stage.get('fuel', -1) <= stage.get('capacity', -1)
                        and stage.get('thrust', 0) > 0 and stage.get('isp', 0) > 0):
                    raise ValueError('Invalid rocket engine')
        if self.blackHole:
            HoleConfig.model_validate(self.blackHole)
        if self.wormhole:
            WormholeConfig.model_validate(self.wormhole)
            w = self.wormhole
            if w.get('throatRadius', 0) <= 0 or len(w.get('orientation', [])) != 4 or w.get('cooldown', 0) <= 0:
                raise ValueError('Invalid wormhole')
        if self.spacecraft:
            SpacecraftConfig.model_validate(self.spacecraft)
            c = self.spacecraft
            if not 0 <= c.get('battery', -1) <= 1 or c.get('capacityWh', 0) <= 0 or c.get('range', 0) <= 0:
                raise ValueError('Invalid spacecraft power/communications')
        return self


class Settings(StrictModel):
    gMultiplier: FiniteFloat = Field(ge=0, le=1000)
    softening: FiniteFloat = Field(ge=1, le=1e12)
    stepSeconds: FiniteFloat = Field(ge=0.01, le=86400)
    timeScale: FiniteFloat
    integrator: Literal['verlet', 'rk4', 'dopri'] = 'verlet'
    adaptive: bool = False
    eta: FiniteFloat = Field(default=0.2, ge=0.001, le=1)
    minStep: FiniteFloat = Field(default=1e-6, ge=1e-9)
    rtol: FiniteFloat = Field(default=1e-9, ge=1e-13, le=0.01)
    positionTolerance: FiniteFloat = Field(default=1, ge=1e-9, le=1e9)
    velocityTolerance: FiniteFloat = Field(default=1e-4, ge=1e-12, le=1e6)
    theta: FiniteFloat = Field(default=0.5, ge=0, le=1)
    collisionMode: Literal['none', 'merge', 'bounce', 'fragment'] = 'merge'
    restitution: FiniteFloat = Field(default=0.8, ge=0, le=1)
    roche: bool = True
    gr: bool = False
    c: FiniteFloat = Field(default=299792458, ge=1e5, le=1e12)
    solver: Literal['auto','direct','tree'] = 'auto'
    fragmentCount: int = Field(default=8, ge=2, le=64)
    fragmentSpread: FiniteFloat = Field(default=1, ge=0, le=10)
    fragmentMinMass: FiniteFloat = Field(default=1, gt=0)
    fragmentDistribution: Literal['equal','varied'] = 'equal'
    tidalMultiplier: FiniteFloat = Field(default=1, ge=0.1, le=10)

    @model_validator(mode='after')
    def speed(self):
        if not 1 <= abs(self.timeScale) <= 1e8:
            raise ValueError('Speed must be between 1x and 1e8x')
        if self.minStep > self.stepSeconds:
            raise ValueError('Minimum step cannot exceed maximum step')
        return self


class PhysicalEvent(StrictModel):
    id: int = Field(gt=0, le=9007199254740991)
    jd: FiniteFloat = Field(ge=2378496.5, lt=2470172.5)
    kind: Literal['merge', 'bounce', 'fragment', 'absorb', 'tidal', 'capture', 'traverse', 'staging', 'mission', 'burn', 'insertion', 'deploy', 'supernova']
    bodyIds: list[Annotated[str, Field(max_length=80)]] = Field(max_length=16)
    message: str = Field(max_length=1000)
    energyDelta: FiniteFloat
    massDelta: FiniteFloat


class Scenario(StrictModel):
    version: Literal[1, 2]
    name: str = Field(min_length=1, max_length=120)
    mode: Literal['reality', 'sandbox']
    jd: FiniteFloat = Field(ge=2378496.5, lt=2470172.5)
    settings: Settings
    bodies: list[Body] = Field(max_length=20000)
    events: list[PhysicalEvent] = Field(default_factory=list, max_length=200)
    eventSerial: int = Field(default=0, ge=0, le=9007199254740991)
    view: dict[str, Any] = Field(default_factory=dict)
    tags: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=20)
    description: str = Field(default='', max_length=4000)
    provenance: dict[str, Any] = Field(default_factory=dict)
    maneuvers: list[dict[str, Any]] = Field(default_factory=list, max_length=256)
    stations: list[dict[str, Any]] = Field(default_factory=list, max_length=128)
    telemetry: list[dict[str, Any]] = Field(default_factory=list, max_length=2400)
    mission: dict[str, Any] = Field(default_factory=dict)
    ephemeris: dict[str, Any] | None = None

    @model_validator(mode='after')
    def identities(self):
        ids = {b.id for b in self.bodies}
        if len(ids) != len(self.bodies):
            raise ValueError('Duplicate body IDs')
        if sum(not b.massless and b.mass > 0 for b in self.bodies) > 512:
            raise ValueError('At most 512 gravitational sources are supported')
        if len({e.id for e in self.events}) != len(self.events) or any(e.id > self.eventSerial for e in self.events):
            raise ValueError('Invalid event IDs')
        for b in self.bodies:
            if b.parentId is not None and (b.parentId not in ids or b.parentId == b.id):
                raise ValueError('Invalid parent ID')
        expected = {'sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'}
        if self.mode == 'reality' and not expected.issubset(ids):
            raise ValueError('Reality requires the eight planets and Sun')
        def finite_json(value, depth=0):
            if depth > 20:
                raise ValueError('JSON is nested too deeply')
            if isinstance(value, float) and not math.isfinite(value):
                raise ValueError('Non-finite JSON number')
            if isinstance(value, dict):
                for x in value.values():
                    finite_json(x, depth + 1)
            elif isinstance(value, (tuple, list)):
                for x in value:
                    finite_json(x, depth + 1)
        for node in self.maneuvers:
            Maneuver.model_validate(node)
        for station in self.stations:
            Station.model_validate(station)
        cameras=self.view.get('savedCameras',[])+self.view.get('keyframes',[])
        if len(cameras)>132:
            raise ValueError('Too many camera states')
        for camera in cameras:
            CameraState.model_validate(camera)
        if self.view.get('camera'):
            CameraState.model_validate(self.view['camera'])
        if self.ephemeris:
            ep=self.ephemeris
            if not isinstance(ep.get('tracks'),dict) or not 2378496.5<=ep.get('startJD',0)<ep.get('endJD',0)<2470172.5:
                raise ValueError('Invalid ephemeris coverage')
            for target,samples in ep['tracks'].items():
                if target not in ids or not isinstance(samples,list) or not 2<=len(samples)<=129:
                    raise ValueError('Invalid ephemeris samples')
                previous=-math.inf
                for sample in samples:
                    if not isinstance(sample,dict) or not isinstance(sample.get('jd'),(float,int)) or sample['jd']<=previous:
                        raise ValueError('Non-monotonic ephemeris')
                    previous=sample['jd']
                    for key in ('position','velocity'):
                        if not isinstance(sample.get(key),list) or len(sample[key])!=3 or any(not isinstance(x,(int,float)) for x in sample[key]):
                            raise ValueError('Invalid ephemeris vector')
        finite_json(self.model_dump())
        return self
