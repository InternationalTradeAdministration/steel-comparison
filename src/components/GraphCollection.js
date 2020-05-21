import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import ComparisonGraph from './ComparisonGraph';
import Loader from 'react-loader-spinner';
import queryString from 'query-string';

class GraphCollection extends Component {
  constructor(props) {
    super(props)
    this.state = {
      results: null,
      total: 0,
      loadingResults: false,
      message: null,
    }
  }

  async componentDidUpdate(prevProps) {
    if ((this.props.location.search !== prevProps.location.search) && (this.props.submitted)) {
      this.setState({ 
        loadingResults: true, 
        results: null,
        total: 0, 
        message: null,
      });
      const tradeResponse = await this.props.tradeRepository._getData(this.props.location.search);
      if (tradeResponse.total === 0) {
        this.setState({ message: 'No results were found for this query.', loadingResults: false })
      } else {
        this.setState({
          results: tradeResponse.results,
          total: tradeResponse.total,
          loadingResults: false,
          message: null,
        });
      }
    }
  }

  render() {
    const query = (this.props.location.search) ? (queryString.parse(this.props.location.search, {arrayFormat: 'comma'})) : {flow_type: "QTY", partner_countries: "World", product_groups: "", reporter_countries: "United States", trade_flow: ""};

    const queryLabelKey = () => {
      /* Deriving queryLabelKey based on the currently available query object */
      if (query['product_groups'].length === 2) {
          return 'product_groups';
        } else if (query['reporter_countries'].length === 2) {
          return 'reporter_countries';
        } else if (query['partner_countries'].length === 2) {
          return 'partner_countries';
        } else if (query['trade_flow'].length === 0) {
          return 'trade_flow';
        }
      };

    const aggregateByProductGroup = (results_array) => {
      const potential_product_groups = ["All Steel Mill Products", "Flat Products", "Long Products", "Pipe and Tube Products", "Semi-Finished Products", "Stainless Products"]
      let paired_results = [];
  
      if (queryLabelKey() === "product_groups") {
        paired_results.push(results_array);
        return paired_results; // return an array containing one nested array which contains 2 objects, representing the two datasets being compared
      } else {
        potential_product_groups.forEach(function (item) {
          if (results_array.filter(entry => entry.product_group === item).length > 0) {
            paired_results.push(results_array.filter(entry => entry.product_group === item));
          }
        })
        return paired_results; // return an array containing 6 nested arrays, where each array is a pair of objects, representing the two datasets being compared
      }
    }

    let paired_results_array = [];
    if (this.state.results && this.state.results.length > 0) {
      paired_results_array = aggregateByProductGroup(this.state.results)
    }
    return (
      <div className="GraphCollection">

        {this.state.loadingResults ? (<div className="spinnerForCharts"><Loader type="RevolvingDot" color="#0071bc" width="100" /></div>) : null}

        {((this.props.submitted) && (paired_results_array.length > 0)) ? (
          paired_results_array.map((r, i) => <ComparisonGraph key={i} data_array={r} queryLabelKey={queryLabelKey()} />)
        ) : null}

        {(!this.state.loadingResults && this.state.message && this.state.total === 0) ? (
          <h3 className="message">{this.state.message}</h3>
        ) : null}
      </div>
    )
  }
}

export default withRouter(GraphCollection);