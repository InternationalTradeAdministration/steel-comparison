import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import Modal from './ComparisonModal';
import { omit, uniq, differenceBy } from 'lodash';
import moment from 'moment';
import config from '../config';
import queryString from 'query-string';

class ComparisonGraph extends Component {
  constructor(props) {
    super(props);
    this.state = { modalOpen: false };
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.onModalButtonClick = this.onModalButtonClick.bind(this);
  }

  openModal() {
    this.setState({modalOpen: true});
  }

  closeModal() {
    this.setState({modalOpen: false});
  }

  onModalButtonClick(event){
    event.preventDefault();
    this.openModal();
  }

  query = queryString.parse(this.props.location.search, {arrayFormat: 'comma'});

  datasetLabelKey = {
    "trade_flow": "trade_flow",
    "reporter_countries": "reporter_country",
    "partner_countries": "partner_country",
    "product_groups": "product_group"
  }

  render() {
    const query = this.query;
    const queryLabelKey = this.props.queryLabelKey;

    const copy_of_data_array = JSON.parse(JSON.stringify(this.props.data_array))

    /* How to refer to the two data sets: */
    const LabelForSeriesA = (this.props.queryLabelKey === 'trade_flow') ? "IMP" : this.query[this.props.queryLabelKey][0];
    const LabelForSeriesB = (this.props.queryLabelKey === 'trade_flow') ? "EXP" : this.query[this.props.queryLabelKey][1];

    const dataObjects = () => {
      /* assign the two objects in the data array accordingly */
      let dataObjA = copy_of_data_array.filter(obj => obj[this.datasetLabelKey[queryLabelKey]] === LabelForSeriesA)[0];
      let dataObjB = copy_of_data_array.filter(obj => obj[this.datasetLabelKey[queryLabelKey]] === LabelForSeriesB)[0];

      /* remove years for null values if a value is null in both datasets */
      if (!!dataObjA) {
        const dataObjA_keys = Object.entries(dataObjA)
        for (const [key, value] of dataObjA_keys) {
          if (  (value === null) && ((!dataObjB)  || (dataObjB[key] === null)) ) {
            delete dataObjA[key]
            if (dataObjB && dataObjB[key] === null) {
              delete dataObjB[key]
            }
          }
        }
      }
      if (!!dataObjB) {
        const dataObjB_keys = Object.entries(dataObjB)
        for (const [key, value] of dataObjB_keys) {
          if (  (value === null) && ((!dataObjA)  || (dataObjA[key] === null)) ) {
            delete dataObjB[key]
            if (dataObjA && dataObjA[key] === null) {
              delete dataObjA[key]
            }
          }
        }
      }
      return { dataObjA, dataObjB }
    }

    const excluded_fields = ['id', 'reporter_country', 'partner_country', 'product_group', 'flow_type', 'ytd_end_month', 'trade_flow', 'updated_date'];
    const original_labelsA = Object.keys(omit(dataObjects().dataObjA, excluded_fields));
    const original_labelsB = Object.keys(omit(dataObjects().dataObjB, excluded_fields));


    const value_arrays = () => {
      let x_axis_values = [];
      let data_valuesA = [];
      let data_valuesB = [];
      let ytd_disclaimer = false;

      /* push the two sets of labels together, dedupe and sort */
      let index_labels = uniq(original_labelsA.concat(original_labelsB)).sort();

      /* If we're comparing two reporter countries, and they have different ytd_end_month, then we've been instructed to remove the YTD fields from the data */
      if ((queryLabelKey === 'reporter_countries') && !!(this.props.data_array[1])) {
        if (this.props.data_array[0].ytd_end_month !== this.props.data_array[1].ytd_end_month) {
          ytd_disclaimer = true;
          let ytd_fields = index_labels.filter(label => label.startsWith('ytd_'));
          index_labels = differenceBy(index_labels, ytd_fields);
        };
      }

      for (let i in index_labels){
        let label = index_labels[i];
        if (dataObjects().dataObjA) { data_valuesA.push(dataObjects().dataObjA[label]/1000) }
        if (dataObjects().dataObjB) { data_valuesB.push(dataObjects().dataObjB[label]/1000) }

        /* prepare the x-axis labels by removing 'sum_' and capitalizing 'ytd' */
        label = label.replace('sum_', '');
        let ytd_label = 'YTD ' + this.props.data_array[0].ytd_end_month + ' ';
        x_axis_values.push(label.replace('ytd_', ytd_label));
      }
      return {x_axis_values, data_valuesA, data_valuesB, ytd_disclaimer};
    };

    function constructChartTitle(queryLabelKey, query, data_array) {
      let units = query.flow_type === 'QTY' ? 'Thousands of Metric Tons' : 'Thousands of U.S. Dollars';
      let flow = query.trade_flow === 'EXP' ? ' Exports to ' : ' Imports from ';
      let chart_title;
      if (queryLabelKey === "product_group") {
        chart_title = (query.reporter_countries + flow + query.partner_countries + ' of ' + query.product_groups + ' in ' + units).replace(',', " and ");
      } else if (queryLabelKey === "trade_flow") {
        chart_title = (query.reporter_countries + ' Imports from and Exports to ' + query.partner_countries + ' of ' + data_array.product_group + ' in ' + units).replace(',', " and ");
      } else {
        chart_title = (query.reporter_countries + flow + query.partner_countries + ' of ' + data_array.product_group + ' in ' + units).replace(',', " and ");
      }
      return chart_title;
    }

    const chartTitle = constructChartTitle(queryLabelKey, query, this.props.data_array[0]);
    const y_axis_label = query.flow_type === 'QTY' ? 'Thousands of Metric Tons' : 'Thousands of U.S. Dollars';

    const constructFootnote = () => {
      let updatedA;
      let updatedB;
      let updated_note;
      if (queryLabelKey === 'reporter_countries') {
        if (!!dataObjects().dataObjA) { updatedA =  moment(dataObjects().dataObjA.updated_date, 'DDMMMYYYY').utc().format('MM-DD-YYYY') };
        if (!!dataObjects().dataObjB) { updatedB =  moment(dataObjects().dataObjB.updated_date, 'DDMMMYYYY').utc().format('MM-DD-YYYY') };

        if (!!updatedA && !!updatedB) {
          updated_note = `${LabelForSeriesA} updated on ${updatedA}, ${LabelForSeriesB} updated on ${updatedB}`;
        } else if (!updatedA) {
          updated_note = `${LabelForSeriesB} updated on ${updatedB}`
        } else { updated_note = `${LabelForSeriesA} updated on ${updatedA}.`}
      } else {
        updated_note = `Updated on ${moment(this.props.data_array[0].updated_date, 'DDMMMYYYY').utc().format('MM-DD-YYYY')}.`
      }
      return (
        <p className="caption"> 
          {`${config.footnote} ${updated_note}`}
        </p> 
      );
    }

    const chartData = {
      labels: value_arrays().x_axis_values,
      datasets: [
        {
          label: LabelForSeriesA,
          data: value_arrays().data_valuesA,
          backgroundColor: '#3668c2',
        },
        {
          label: LabelForSeriesB,
          data: value_arrays().data_valuesB,
          backgroundColor: '#9a9a9a',
        },
      ],
    };

    const chartOptions = {
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: y_axis_label,
            fontSize: 14,
          },
          ticks: {
            maxTicksLimit: 15,
            beginAtZero: true,
            userCallback: function(value) {
              return parseFloat(value.toFixed(2)).toLocaleString();
            },
            fontSize: 14,
            lineHeight: 16,
          },
          minBarLength: '10px',
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            fontSize: 14,
          },
          ticks: {
            autoSkip: false,
            fontSize: 14,
            lineHeight: 16,
          },
        }],
      },
      maintainAspectRatio: false,
      tooltips: {
        mode: 'index',
        callbacks : {
          label: function(tooltipItem, data) {
            let label = data.datasets[tooltipItem.datasetIndex].label || '';
            if (label) { label += ': '}
            label += Math.round(tooltipItem.yLabel * 1000) / 1000;
            return label;
          },
        },
        titleFontSize: 14,
        bodyFontSize: 14,
      },
      legend: {
        labels: {
          fontSize: 14,
        },
      },
      layout: {
        padding: {
          top: 10,
          bottom: 0,
          left: 0,
          right: 0,
        }
      },
    };

    const { x_axis_values, data_valuesA, data_valuesB, ytd_disclaimer } = value_arrays();

    return (
      <div className="Graph">
        <h4 className="ChartTitle">
          {chartTitle + ' - '}
          <button className="modalOpen" aria-label="Open modal to view data table" title="Open modal to view data table" onClick={this.onModalButtonClick}>View Data Table</button>
        </h4>
        <Bar 
          data={chartData}
          options={chartOptions}
        />
        <Modal 
          modalOpen={this.state.modalOpen} 
          closeModal={this.closeModal} 
          labels={x_axis_values}
          LabelForSeriesA={LabelForSeriesA}
          LabelForSeriesB={LabelForSeriesB}
          data_valuesA={data_valuesA}
          data_valuesB={data_valuesB}
          title={chartTitle}
          ytd_disclaimer={ytd_disclaimer}
        />
        {constructFootnote()}
      </div>
    )
  }
};

export default withRouter(ComparisonGraph);