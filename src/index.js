import 'react-app-polyfill/ie11'; // this polyfill needs to be first for IE11 support
import 'babel-polyfill'; // necessary for IE11 support for Router
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import App from './components/FormContainer';
import * as serviceWorker from './serviceWorker';
import { TradeRepository } from './repositories/TradeRepository';
import './css/steel-search.css';
import './css/dropdown-menus.css';

export const history = createBrowserHistory();

function renderSteelSearch(divID, BASE_URL, API_KEY) {

  ReactDOM.render(
    <Router history={history}>
      <App tradeRepository={new TradeRepository(BASE_URL, API_KEY)} />
    </Router>,
    document.getElementById(divID)
  );
}

export default renderSteelSearch;
window.Explorer = {
  renderSteelSearch: renderSteelSearch,
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
