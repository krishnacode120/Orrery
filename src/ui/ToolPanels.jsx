import {ObservationTools,PlanetComparison,RendezvousTools,ReplayTools} from './ScienceTools.jsx';
import {MissionPlanner,GodTools,Measurement,CollisionLab} from './ExplorationTools.jsx';
export default function ToolPanels({name,run}){const Panel={planner:MissionPlanner,god:GodTools,measure:Measurement,collision:CollisionLab,observe:ObservationTools,compare:PlanetComparison,rendezvous:RendezvousTools,replay:ReplayTools}[name];return Panel?<Panel run={run}/>:null;}
