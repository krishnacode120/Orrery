import UniversePanel from './UniverseCatalogPanel.jsx';
import {Builder,InterstellarPlanner} from './UniverseLabPanels.jsx';
import {ObservationExplorer,TimeMachine,Analyst,Challenges,Sensors} from './UniverseSciencePanels.jsx';
export default function UniverseTools({name,run}){const Panel={universe:UniversePanel,builder:Builder,formation:Builder,interstellar:InterstellarPlanner,'observe-universe':ObservationExplorer,'time-machine':TimeMachine,discovery:Analyst,challenges:Challenges,sensors:Sensors}[name];return Panel?<Panel run={run} formation={name==='formation'}/>:null;}
