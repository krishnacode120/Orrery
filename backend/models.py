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
    engineCount: int = Field(default=1, ge=1, le=100)
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
    separationSpeed: FiniteFloat = Field(default=1, ge=0, le=100)

class SpacecraftConfig(ConfigBlock):
    range: FiniteFloat = Field(gt=0)
    battery: FiniteFloat = Field(ge=0,le=1)
    capacityWh: FiniteFloat = Field(gt=0)
    solarWatts: FiniteFloat = Field(ge=0)
    loadWatts: FiniteFloat = Field(ge=0)
    orientation: Vec3
    epochJD: FiniteFloat
    payload: Literal['standby','active','off']
    transmitterPower: FiniteFloat = Field(default=20, ge=0, le=1e12)
    antennaGain: FiniteFloat = Field(default=30, ge=-100, le=100)

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
    jd: FiniteFloat = Field(ge=2378496.5,lt=2816787.5)
    direction: Literal['prograde','retrograde','in','out','normal','antinormal','vector']
    deltaV: FiniteFloat = Field(ge=0,le=1e7)
    vector: Vec3
    executed: bool
    components: Vec3 | None = None

    @model_validator(mode='after')
    def bounded_burn(self):
        if math.hypot(*self.vector) > 1e7 or self.components is not None and math.hypot(*self.components) > 1e7:
            raise ValueError('Maneuver exceeds supported delta-v')
        return self

class Station(ConfigBlock):
    id: str = Field(min_length=1,max_length=80)
    name: str = Field(min_length=1,max_length=120)
    bodyId: str = Field(min_length=1,max_length=80)
    latitude: FiniteFloat = Field(ge=-90,le=90)
    longitude: FiniteFloat = Field(ge=-180,le=180)
    altitude: FiniteFloat = Field(default=0,ge=0)

class CameraState(ConfigBlock):
    name: str | None = Field(default=None, max_length=80)
    id: str | None = Field(default=None, max_length=80)
    position: Vec3 | None = None
    target: Vec3 | None = None
    positionSI: Vec3 | None = None
    targetSI: Vec3 | None = None
    orientation: tuple[FiniteFloat, FiniteFloat, FiniteFloat, FiniteFloat] | None = None
    mode: Literal['free','orbit','follow','chase','target-lock','cinematic','surface','rocket','satellite'] | None = None
    fov: FiniteFloat = Field(default=42, ge=.1, le=120)
    scale: Literal['system','planetary','earth','vehicle','true']

    @model_validator(mode='after')
    def complete_pose(self):
        if self.positionSI is not None:
            if self.targetSI is None or self.orientation is None or self.mode is None or math.hypot(*self.orientation) < .001:
                raise ValueError('Incomplete inertial camera pose')
        elif self.position is None or self.target is None:
            raise ValueError('Incomplete legacy camera pose')
        return self

class NavigationConfig(ConfigBlock):
    speed: FiniteFloat = Field(default=1495978707, ge=.01, le=1495978707000)
    fov: FiniteFloat = Field(default=42, ge=.1, le=120)
    chaseOrientation: Literal['velocity','attitude'] = 'velocity'
    vertical: Literal['camera','world'] = 'world'
    reference: Literal['inertial','sun','planet','moon','spacecraft','velocity'] = 'inertial'
    sensitivity: FiniteFloat = Field(default=.0025, ge=.0001, le=.05)
    translationDamping: FiniteFloat = Field(default=8, ge=0, le=100)
    rotationDamping: FiniteFloat = Field(default=14, ge=0, le=100)
    zoomDamping: FiniteFloat = Field(default=10, ge=0, le=100)
    followDamping: FiniteFloat = Field(default=5, ge=0, le=100)


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
            r = RocketConfig.model_validate(self.rocket).model_dump(mode='json',exclude_unset=True)
            self.rocket = r
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
            self.blackHole = HoleConfig.model_validate(self.blackHole).model_dump(mode='json',exclude_unset=True)
        if self.wormhole:
            w = WormholeConfig.model_validate(self.wormhole).model_dump(mode='json',exclude_unset=True)
            self.wormhole = w
            if w.get('throatRadius', 0) <= 0 or len(w.get('orientation', [])) != 4 or w.get('cooldown', 0) <= 0 or math.hypot(*w['orientation']) == 0:
                raise ValueError('Invalid wormhole')
        if self.spacecraft:
            c = SpacecraftConfig.model_validate(self.spacecraft).model_dump(mode='json',exclude_unset=True)
            self.spacecraft = c
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
        if not .01 <= abs(self.timeScale) <= 4e8:
            raise ValueError('Speed must be between 0.01x and 4e8x')
        if self.minStep > self.stepSeconds:
            raise ValueError('Minimum step cannot exceed maximum step')
        return self


class PhysicalEvent(StrictModel):
    id: int = Field(gt=0, le=9007199254740991)
    jd: FiniteFloat = Field(ge=2378496.5, lt=2816787.5)
    kind: Literal['merge', 'bounce', 'fragment', 'absorb', 'tidal', 'capture', 'traverse', 'staging', 'mission', 'burn', 'insertion', 'deploy', 'supernova', 'soi', 'apsis', 'landing', 'eclipse', 'experiment']
    bodyIds: list[Annotated[str, Field(max_length=80)]] = Field(max_length=16)
    message: str = Field(max_length=1000)
    energyDelta: FiniteFloat
    massDelta: FiniteFloat


class ExperimentOperation(StrictModel):
    kind: Literal['mass','radius','density','position','velocity','spin','tilt','temperature','gravity','create','delete','burn','ignite','cutoff','stage','collision','fragment']
    bodyId: str | None = Field(default=None, max_length=80)
    otherId: str | None = Field(default=None, max_length=80)
    mode: Literal['set','multiply','add'] | None = None
    value: FiniteFloat | None = None
    vector: Vec3 | None = None
    factor: FiniteFloat | None = Field(default=None, ge=-1000, le=1000)
    relative: bool = False
    children: bool = False
    fuelAware: bool = False
    speed: FiniteFloat = Field(default=1000, ge=0, le=1e7)
    count: int = Field(default=8, ge=2, le=64)
    body: Body | None = None

    @model_validator(mode='after')
    def operation(self):
        if self.mode is None:
            self.mode = 'add' if self.kind in ('position','velocity','burn') else 'set'
        if self.kind == 'burn' and self.mode != 'add':
            raise ValueError('Burn is an additive impulse')
        if self.kind not in ('gravity','create') and not self.bodyId:
            raise ValueError('Operation requires bodyId')
        if self.kind in ('mass','radius','density','spin','tilt','temperature','gravity') and (self.value is None or abs(self.value)>1e40 or self.mode not in ('set','multiply')):
            raise ValueError('Invalid scalar operation')
        if self.kind in ('position','velocity','burn') and (self.vector is None or max(abs(x) for x in self.vector)>1e20 or self.mode=='multiply' and self.factor is None):
            raise ValueError('Invalid vector operation')
        if self.kind=='create' and self.body is None:
            raise ValueError('Creation requires full body')
        if self.kind=='collision' and not self.otherId:
            raise ValueError('Collision requires otherId')
        return self


class ExperimentEvent(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    jd: FiniteFloat = Field(ge=2378496.5, lt=2816787.5)
    operation: ExperimentOperation
    executed: bool = False
    actualJD: FiniteFloat | None = Field(default=None, ge=2378496.5, lt=2816787.5)
    failed: str | None = Field(default=None, max_length=1000)


class ScenarioBranch(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    parentId: str = Field(min_length=1, max_length=80)
    name: str = Field(max_length=120)
    epochJD: FiniteFloat = Field(ge=2378496.5, lt=2816787.5)


class Scenario(StrictModel):
    version: Literal[1, 2]
    name: str = Field(min_length=1, max_length=120)
    mode: Literal['reality', 'sandbox']
    jd: FiniteFloat = Field(ge=2378496.5, lt=2816787.5)
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
    experimentEvents: list[ExperimentEvent] = Field(default_factory=list, max_length=256)
    branch: ScenarioBranch | None = None

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
        if self.mode == 'reality' and self.jd >= 2470172.5:
            raise ValueError('Reality epoch outside the JPL approximate table')
        if len({e.id for e in self.experimentEvents}) != len(self.experimentEvents):
            raise ValueError('Duplicate experiment event IDs')
        expected = {'sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'}
        if self.mode == 'reality' and not expected.issubset(ids):
            raise ValueError('Reality requires the eight planets and Sun')
        def finite_json(value, depth=0):
            if depth > 20:
                raise ValueError('JSON is nested too deeply')
            if isinstance(value,(int,float)) and not isinstance(value,bool) and not number(value):
                raise ValueError('Non-finite JSON number')
            if isinstance(value, dict):
                for x in value.values():
                    finite_json(x, depth + 1)
            elif isinstance(value, (tuple, list)):
                for x in value:
                    finite_json(x, depth + 1)
        if self.maneuvers:
            self.maneuvers=[Maneuver.model_validate(node).model_dump(mode='json',exclude_unset=True) for node in self.maneuvers]
        if self.stations:
            self.stations=[Station.model_validate(station).model_dump(mode='json',exclude_unset=True) for station in self.stations]
        if len({n['id'] for n in self.maneuvers}) != len(self.maneuvers):
            raise ValueError('Duplicate maneuver IDs')
        if len({s['id'] for s in self.stations}) != len(self.stations):
            raise ValueError('Duplicate station IDs')
        if self.view.get('scaleMode', 'visibility') not in ('scientific', 'visibility', 'educational', 'custom'):
            raise ValueError('Invalid scale model')
        for key in ('distanceScale','planetScale','moonScale','spacecraftScale','trailScale','labelScale'):
            if key in self.view:
                value=self.view[key]
                if isinstance(value, bool) or not isinstance(value, (int,float)) or not .01 <= value <= 1e6:
                    raise ValueError('Invalid display scale: '+key)
        for key in ('smoothMotion','pauseVisualEffects','realDistances','realRadii','showMoons','showSOI','autoArrival','predictionPaths','transferPath','showAcceleration','showBarycenter','miniMap','pip','habitableZone','interior','discoveryNotifications'):
            if key in self.view and not isinstance(self.view[key], bool):
                raise ValueError('Invalid view flag: '+key)
        if self.view.get('environment') not in (None,'magnetic','radiation'):
            raise ValueError('Invalid environmental layer')
        if self.view.get('notificationCategory') not in (None,'mission','science','physics','all'):
            raise ValueError('Invalid notification category')
        sensor = self.view.get('sensorView')
        if sensor is not None:
            if not isinstance(sensor,dict) or sensor.get('mode') not in ('forward','target','earth','sun') or isinstance(sensor.get('fov'),bool) or not isinstance(sensor.get('fov'),(int,float)) or not .1<=sensor['fov']<=120 or sensor.get('targetId') is not None and (not isinstance(sensor['targetId'],str) or len(sensor['targetId'])>80):
                raise ValueError('Invalid optical sensor configuration')
        if self.view.get('navigation'):
            self.view['navigation']=NavigationConfig.model_validate(self.view['navigation']).model_dump(mode='json',exclude_unset=True)
        time_bookmarks=self.view.get('timeBookmarks',[])
        if not isinstance(time_bookmarks,list) or len(time_bookmarks)>100 or any(not isinstance(x,dict) or not isinstance(x.get('name'),str) or len(x['name'])>80 or not isinstance(x.get('jd'),(int,float)) or not 2378496.5<=x['jd']<2470172.5 for x in time_bookmarks):
            raise ValueError('Invalid time bookmarks')
        for key, limit in (('savedCameras',100),('keyframes',32)):
            value=self.view.get(key,[])
            if not isinstance(value,list) or len(value)>limit or any(not isinstance(c,dict) for c in value):
                raise ValueError('Invalid '+key)
        history=self.view.get('trailHistory',{})
        if not isinstance(history,dict) or len(history)>40:
            raise ValueError('Invalid trail history')
        def number(x):
            if not isinstance(x,(int,float)) or isinstance(x,bool):
                return False
            try:
                return math.isfinite(x)
            except OverflowError:
                return False
        for target,points in history.items():
            if not isinstance(target,str) or len(target)>80 or not isinstance(points,list) or len(points)>1024:
                raise ValueError('Invalid trail samples')
            for point in points:
                if not isinstance(point,dict) or not number(point.get('jd')) or not 2378496.5<=point['jd']<2816787.5 or not isinstance(point.get('position'),list) or len(point['position'])!=3 or any(not number(x) or abs(x)>1e20 for x in point['position']):
                    raise ValueError('Invalid trail samples')
        cameras=self.view.get('savedCameras',[])+self.view.get('keyframes',[])
        if len(cameras)>132:
            raise ValueError('Too many camera states')
        for camera in cameras:
            CameraState.model_validate(camera)
        if self.view.get('camera'):
            CameraState.model_validate(self.view['camera'])
        if self.ephemeris:
            ep=self.ephemeris
            if not isinstance(ep.get('tracks'),dict) or not number(ep.get('startJD')) or not number(ep.get('endJD')) or not 2378496.5<=ep['startJD']<ep['endJD']<2470172.5:
                raise ValueError('Invalid ephemeris coverage')
            for target,samples in ep['tracks'].items():
                if target not in ids or not isinstance(samples,list) or not 2<=len(samples)<=129:
                    raise ValueError('Invalid ephemeris samples')
                previous=-math.inf
                for sample in samples:
                    if not isinstance(sample,dict) or not number(sample.get('jd')) or sample['jd']<=previous or not 2378496.5<=sample['jd']<2470172.5:
                        raise ValueError('Non-monotonic ephemeris')
                    previous=sample['jd']
                    for key in ('position','velocity'):
                        if not isinstance(sample.get(key),list) or len(sample[key])!=3 or any(not number(x) or abs(x)>1e20 for x in sample[key]):
                            raise ValueError('Invalid ephemeris vector')
        finite_json(self.model_dump())
        return self
