import * as React from 'react';
import * as ReactDom from 'react-dom';
import { GameData } from '@st/shared/build/data/loader';
import { App } from './app';

document.addEventListener('DOMContentLoaded', () => {
    GameData.load();
    ReactDom.render(<App />, document.getElementById('main'));
});