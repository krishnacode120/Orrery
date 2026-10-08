import {useEffect} from 'react';
import {useSimStore} from './store/useSimStore.js';
import {useReplayStore} from './store/useReplayStore.js';
import {useCameraStore} from './store/useCameraStore.js';
export function replayFrame(index){
 const replay=useReplayStore.getState(),frame=replay.frames[index];if(!frame)return;
 const current=useSimStore.getState(),scenario=structuredClone(frame.scenario);
 // Keep the viewer's camera independent of recorded physical state.
 scenario.view={...scenario.view,...current.scenario.view};
 useSimStore.setState({scenario,revision:current.revision+1,paused:true,stepRequest:false,replayActive:true,stats:null,prediction:null});
 useReplayStore.setState({index,playback:true});
}
export function enterReplay(){
 const sim=useSimStore.getState(),replay=useReplayStore.getState();if(!replay.frames.length)throw new Error('Record or import snapshots first');
 if(!replay.playback)useReplayStore.setState({live:{scenario:structuredClone(sim.scenario),paused:sim.paused},recording:false});
 replayFrame(replay.index);
}
export function exitReplay(){
 const replay=useReplayStore.getState();if(!replay.live)return;
 const current=useSimStore.getState(),scenario=structuredClone(replay.live.scenario);scenario.view=current.scenario.view;
 useSimStore.setState({scenario,revision:current.revision+1,paused:replay.live.paused,replayActive:false,stats:null});
 useReplayStore.setState({playback:false,playing:false,live:null});
}
export function useReplay(){
 useEffect(()=>{
  let eventSerial=-1,lastCapture=0,lastPlay=0;
  const timer=setInterval(()=>{
   const sim=useSimStore.getState(),replay=useReplayStore.getState(),now=performance.now();
   if(replay.recording&&!replay.playback&&(now-lastCapture>2000||sim.scenario.eventSerial!==eventSerial)){replay.capture(sim.scenario);lastCapture=now;eventSerial=sim.scenario.eventSerial;}
   if(replay.playback&&replay.playing&&now-lastPlay>1000){lastPlay=now;if(replay.index>=replay.frames.length-1)useReplayStore.setState({playing:false});else replayFrame(replay.index+1);}
  },250);return()=>clearInterval(timer);
 },[]);
}
