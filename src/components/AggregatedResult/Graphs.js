import React, { PropTypes } from 'react';
import { values, pickBy, has, omit, map, startCase } from '../../utils/lodash';
import moment from 'moment';
import {Line} from 'react-chartjs-2';
import GraphColors from './GraphColors';

const LineGraph = ({ data, report_type }) => {
  let data_row_field = "";
  if (report_type === 'partner_countries')
    data_row_field = 'product_group';
  else if (report_type === 'product_groups')
    data_row_field = 'partner_country';

  let color_index = 0;
  
  const datasets = map(data.slice(0, 10), (entry) => {
    color_index += 1;
    return(
      {
        label: entry[data_row_field],
        fill: false,
        backgroundColor: 'rgba(' + GraphColors[color_index] + ',0.4)',
        borderColor: 'rgba(' + GraphColors[color_index] + ',1)',
        pointBorderColor: 'rgba(' + GraphColors[color_index] + ',1)',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 5,
        pointHitRadius: 10,
        data: values(omit(entry, [data_row_field, 'flow_type', 'ytd_2016', 'ytd_2017', 'percent_change_ytd'])),
      }
    );
  });
  
  const labels = map(Object.keys(omit(data[0], [data_row_field, 'flow_type', 'ytd_2016', 'ytd_2017', 'percent_change_ytd'])), (label)=> {
    return label.replace('sum_', '');
  });

  const chartData = {
    labels: labels,
    datasets: datasets
  };

  let chartTitle = "";
  if (data[0]['flow_type'] == 'QTY'){
    chartTitle = 'Annual Steel Exports (Metric Tons)';
  }
  else {
    chartTitle = 'Annual Steel Exports (US Dollars)';
  }
  
  const chartOptions = {
        title: {
            display: true,
            text: chartTitle
        },
        legend: {
            display: true
        },
        scales: { 
          yAxes: [{
              ticks: {
                    maxTicksLimit: 15
                  }
            }]
        }
    }
  return (
    <Line className='line-graph' data={chartData} options={chartOptions}/>
  )
}

export {
  LineGraph
};