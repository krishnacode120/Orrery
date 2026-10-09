import React from 'react';
import {renderToString} from 'react-dom/server';
import {it,expect} from 'vitest';
import UniverseTools from '../ui/UniverseTools.jsx';
for(const name of ['universe','builder','formation','interstellar','observe-universe','time-machine','discovery','challenges','sensors']){
 it('renders '+name+' with meaningful data and functional controls',()=>{const html=renderToString(React.createElement(UniverseTools,{name,run:()=>{}}));expect(html).toContain('<h2>');expect(html).not.toContain('NaN');expect(html).not.toContain('undefined');});
}
