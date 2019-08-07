import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import Select from 'react-select';
import LoadingOverlay from 'react-loading-overlay';
import GraphCollection from './GraphCollection';
import config from '../config.js';
import { searchQuery } from '../utils/searchQuery';
import { map, compact, isEmpty } from 'lodash';
import { propComparator } from '../utils/sort';

class Form extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ReporterOptions: [],
      PartnerOptions: [],
      ProductGroupOptions: [],
      loadingForm: false,

      TradeFlow: { value: "IMP", label: "Imports" },
      FlowType: { value: "QTY", label: "Quantity (Metric Tons)" },

      ReporterCountry1: { value: "United States", label: "United States" },
      ReporterCountry2: { value: "", label: "Select second Reporting Country" },

      PartnerCountry1: { value: "World", label: "All Countries" },
      PartnerCountry2: { value: "", label: "Select second Partner Country" },

      ProductGroup1: { value: "", label: "Select Product Group" },
      ProductGroup2: { value: "", label: "Select second Product Group" },

      submitted: false,
      message: "",
    };
    this.handleSelect = this.handleSelect.bind(this);
  };

  handleSelect(name, option) {
    this.setState({ [name]: option });
  };

  async componentDidMount() {
    await this.setState({ loadingForm: true })
    const tradeResponse = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value)
    const tradeResponsePartners = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value, 'United States'); // the first time this form loads, return Partners taking into account the default ReporterCountry1 (United States)

    await this.setState({
      loadingForm: false,
      ReporterOptions: this.extractOptions(tradeResponse.aggregations.reporters),
      PartnerOptions: this.extractPartnerCountries(tradeResponsePartners.aggregations.partners),
      ProductGroupOptions: this.extractOptions(tradeResponse.aggregations.product_groups),
    });
  };

  async componentDidUpdate(prevProps, prevState) {
    if (this.props.comparisonType !== prevProps.comparisonType) {
      // if the comparison type changes, 'second' selections reset to default so they don't accidentally get sent
      this.setState({
        loadingForm: false,
        submitted: false,
        ReporterCountry2: { value: "", label: "Select second Reporting Country" },
        PartnerCountry2: { value: "", label: "Select second Partner Country" },
        ProductGroup1: { value: "", label: "Select Product Group" },
        ProductGroup2: { value: "", label: "Select second Product Group" },
        message: "",
      });
    }
    if ((this.state.ReporterCountry1.value !== prevState.ReporterCountry1.value) || (this.state.ReporterCountry2.value !== prevState.ReporterCountry2.value)) {
      // if change either Reporter Country, update the Partner Options based on the Reporters and the Trade Flow
      await this.setState({ loadingForm: true })
      const reporters = await `${this.state.ReporterCountry1.value},${this.state.ReporterCountry2.value}`;

      const tradeResponse = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value, reporters);
      await this.setState({
        loadingForm: false,
        submitted: false,
        PartnerOptions: this.extractPartnerCountries(tradeResponse.aggregations.partners),
        ProductGroupOptions: this.extractOptions(tradeResponse.aggregations.product_groups),
        // .. and reset the Partner selections and product groups
        PartnerCountry1: { value: "World", label: "All Countries" },
        PartnerCountry2: { value: "", label: "Select second Partner Country" },
        ProductGroup1: { value: "", label: "Select Product Group" },
        ProductGroup2: { value: "", label: "Select second Product Group" },
        message: "",
      });
    }
    if ((this.props.comparisonType === "Product Groups") && (this.state.PartnerCountry1.value !== prevState.PartnerCountry1.value)) {
      // if change the Partner Country while comparing Product Groups, update the Product Group Options based on this new Partner Country
      await this.setState({ loadingForm: true })
      const reporters = await `${this.state.ReporterCountry1.value},${this.state.ReporterCountry2.value}`;
      const partners = await `${this.state.PartnerCountry1.value},${this.state.PartnerCountry2.value}`;

      const tradeResponse = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value, reporters, partners);
      await this.setState({
        loadingForm: false,
        submitted: false,
        ProductGroupOptions: this.extractOptions(tradeResponse.aggregations.product_groups),
        ProductGroup1: { value: "", label: "Select Product Group" },
        ProductGroup2: { value: "", label: "Select second Product Group" },
        message: "",
      });
    }
    if (this.state.TradeFlow.value !== prevState.TradeFlow.value) {
      // if change the Trade Flow, update the Reporter Options based on this...
      await this.setState({ loadingForm: true });
      const tradeResponse = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value);
      const tradeResponsePartners = await this.props.tradeRepository._getAggregations(this.state.TradeFlow.value, 'United States'); // and because we're resetting the Reporter Options, we need to reset the Partner options to avoid being able to select pairs with no search results

      await this.setState({
        loadingForm: false,
        submitted: false,
        ReporterOptions: this.extractOptions(tradeResponse.aggregations.reporters),
        PartnerOptions: this.extractPartnerCountries(tradeResponsePartners.aggregations.partners),
        // ... and reset all form selections except Unit of Measure
        ReporterCountry1: { value: "United States", label: "United States" },
        ReporterCountry2: { value: "", label: "Select second Reporting Country" },
        PartnerCountry1: { value: "World", label: "All Countries" },
        PartnerCountry2: { value: "", label: "Select second Partner Country" },
        ProductGroup1: { value: "", label: "Select Product Group" },
        ProductGroup2: { value: "", label: "Select second Product Group" },
        message: "",
      });
    }
  };

  extractOptions(aggregations) {
    let options = map(aggregations, obj => {
      return { label: obj['key'], value: obj['key'] };
    }).sort(propComparator('value', 'asc'));
    return options;
  };

  extractPartnerCountries(partners) {
    let world_option = {};
    let partner_countries = compact(map(partners, obj => {
      if (obj['key'] === 'World') {
        world_option = { label: 'All Countries', value: obj['key'] };
        return null;
      }
      else
        return { label: obj['key'], value: obj['key'] };
    })).sort(propComparator('value', 'asc'));

    if (!isEmpty(world_option))
      partner_countries.unshift(world_option);

    return partner_countries;
  };

  formValidation = () => {
    const { comparisonType } = this.props;
    const { ReporterCountry2, PartnerCountry2, ProductGroup1, ProductGroup2 } = this.state;
    let errorMessage;
    if ((comparisonType === "Reporting Countries") && (!ReporterCountry2.value)) {
      errorMessage = "Please select second Reporting Country";
    } else if ((comparisonType === "Partner Countries") && (!PartnerCountry2.value)) {
      errorMessage = "Please select second Partner Country";
    } else if ((comparisonType === "Product Groups") && ((!ProductGroup1.value) || (!ProductGroup2.value))) {
      errorMessage = "Please select two Product Groups";
    } else errorMessage = "";
    return errorMessage;
  }

  handleSubmit = (event) => {
    let errorMessage = this.formValidation();
    if (errorMessage === "") {
      event.preventDefault();
      this.setState({ submitted: true, message: "" })
      this.props.history.push({ search: `${searchQuery(this.state, this.props.comparisonType)}` });
    } else {
      event.preventDefault();
      this.setState({ message: errorMessage });
    }
  };

  componentWillMount() {
    this.setState({ submitted: true }, () => {
      this.props.history.push({ search: `${searchQuery(this.state, this.props.comparisonType)}` });
    })
  }

  render() {
    return (
      <div>
        <div className="form-and-instructions">
          <h2>Comparing {this.props.comparisonType}</h2>
          <p><b>All fields are required.</b>  <a href={config.faqs_link} target="_blank" rel="noopener noreferrer">FAQs</a></p>

          <form onSubmit={this.handleSubmit}>
            <LoadingOverlay active={this.state.loadingForm} spinner text='Updating form options...'>
              <b>Trade Flow: </b><br /><p>Direction of trade: exports or imports</p>
              {this.props.comparisonType === "Trade Flows" ? (
                <Select
                  name="TradeFlow"
                  className="TradeFlow"
                  classNamePrefix="React_select"
                  options={[{ value: "", label: "Imports and Exports" }]}
                  value={{ value: "", label: "Imports and Exports" }}
                  isMulti
                  isDisabled={true}
                  isClearable={false}
                  onChange={option => this.handleSelect("TradeFlow", option)}
                  aria-label="Select Trade Flow"
                />
              ) : (
                  <Select
                    name="TradeFlow"
                    className="TradeFlow"
                    classNamePrefix="React_select"
                    value={this.state.TradeFlow}
                    defaultValue={{ value: "IMP", label: "Imports" }}
                    onChange={option => this.handleSelect("TradeFlow", option)}
                    options={[{ value: "IMP", label: "Imports" }, { value: "EXP", label: "Exports" }]}
                    aria-label="Select Trade Flow"
                  />
                )}
              <br />
              <b>Reporting Country: </b><br /><p>A country reporting steel trade from either its exporting or importing perspective</p>
              <Select
                name="ReporterCountry1"
                className="ReportingCountries"
                classNamePrefix="React_select"
                options={this.state.ReporterOptions}
                value={this.state.ReporterCountry1}
                onChange={(option) => this.handleSelect("ReporterCountry1", option)}
                aria-label="Select Reporting Country"
              />
              {this.props.comparisonType === "Reporting Countries" ? (
                <Select
                  name="ReporterCountry2"
                  className="ReportingCountries"
                  classNamePrefix="React_select"
                  options={this.state.ReporterOptions}
                  value={this.state.ReporterCountry2}
                  onChange={(option) => this.handleSelect("ReporterCountry2", option)}
                  aria-label="Select Second Reporting Country"
                />
              ) : null}
              <br />
              <b>Partner Country: </b><br /><p>Destination of a reporting country’s steel exports or imports</p>
              <Select
                name="PartnerCountry1"
                className="PartnerCountries"
                classNamePrefix="React_select"
                options={this.state.PartnerOptions}
                value={this.state.PartnerCountry1}
                onChange={(option) => this.handleSelect("PartnerCountry1", option)}
                aria-label="Select Partner Country"
              />
              {this.props.comparisonType === "Partner Countries" ? (
                <Select
                  name="PartnerCountry2"
                  className="PartnerCountries"
                  classNamePrefix="React_select"
                  options={this.state.PartnerOptions}
                  value={this.state.PartnerCountry2}
                  onChange={(option) => this.handleSelect("PartnerCountry2", option)}
                  aria-label="Select Second Partner Country"
                />
              ) : null}
              {this.props.comparisonType === "Product Groups" ? (
                <>
                  <br />
                  <b>Product Group: </b><br /><p>Steel Mill Products are contained in Flat, Long, Pipe/Tube, Semi-Finished or Stainless products. <a href="https://www.trade.gov/steel/pdfs/product-definitions.pdf" target="_blank" rel="noopener noreferrer">More Information.</a></p>
                  <Select
                    name="ProductGroup1"
                    className="ProductGroups"
                    classNamePrefix="React_select"
                    options={this.state.ProductGroupOptions}
                    value={this.state.ProductGroup1}
                    onChange={(option) => this.handleSelect("ProductGroup1", option)}
                    aria-label="Select Product Group"
                  />
                  <Select
                    name="ProductGroup2"
                    className="ProductGroups"
                    classNamePrefix="React_select"
                    options={this.state.ProductGroupOptions}
                    value={this.state.ProductGroup2}
                    onChange={(option) => this.handleSelect("ProductGroup2", option)}
                    aria-label="Select Second Product Group"
                  />
                </>
              ) : null}
              <br />
              <b>Quantity or Value: </b><br /><p>Unit of measure - either metric tons or U.S. dollars</p>
              <Select
                name="FlowType"
                className="FlowType"
                classNamePrefix="React_select"
                options={[{ value: "QTY", label: "Quantity (Metric Tons)" }, { value: "VALUE", label: "Value (US Dollars)" }]}
                value={this.state.FlowType}
                onChange={(option) => this.handleSelect("FlowType", option)}
                aria-label="Select Flow Type"
              />
              <button type="submit" onSubmit={this.handleSubmit}>Generate Graphs</button>
              <a className="buttonStyle" href={config.GSTM_link} target="_blank" rel="noopener noreferrer">Return to the Global Steel Trade Monitor</a>
            </LoadingOverlay>
          </form>
        </div>
        { this.state.message ? (
          <h3 className="message">{this.state.message}</h3>
        ) : null }
        <GraphCollection
          tradeRepository={this.props.tradeRepository}
          comparisonType={this.props.comparisonType}
          submitted={this.state.submitted}
        />
      </div>
    )
  }
};

export default withRouter(Form);