import { routerMiddleware } from 'connected-react-router';
import { createBrowserHistory } from 'history';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';

import createRootReducer from '../../redux/reducers/index';

let history;
let middlewareEnhancer;
let store;

beforeEach(() => {
    history = createBrowserHistory();
    middlewareEnhancer = applyMiddleware(thunk, routerMiddleware(history));
    store = createStore(createRootReducer(history), middlewareEnhancer);
});

it('Redux store inited corrected', () => {
    expect(store.getState().hasOwnProperty('Access')).toBe(true);
});
