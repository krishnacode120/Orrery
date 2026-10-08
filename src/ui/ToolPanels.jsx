import {MissionPlanner,GodTools,Measurement,CollisionLab} from './ExplorationTools.jsx';
export default function ToolPanels({name,run}){const Panel={planner:MissionPlanner,god:GodTools,measure:Measurement,collision:CollisionLab}[name];return Panel?<Panel run={run}/>:null;}
