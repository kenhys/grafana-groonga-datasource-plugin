import _ from "lodash";

export class GroongaDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options) {
    var target = options.targets[0];
    var column = target.column;
    var timeColumn;
    if (target.timeColumns.indexOf('timestamp') >= 0) {
      timeColumn = 'timestamp';
    } else {
      timeColumn = target.timeColumns[0];
    }
    var selectOptions = {
      table: target.table,
      output_columns: timeColumn + ', ' + target.column,
      filter: 'between(' + timeColumn + ', ' +
                       options.range.from.unix() + ', "include", ' +
                       options.range.to.unix() + ', "include")',
      limit: -1
    };
    var requestOptions = {
      url: this.datasource.url + '/d/select?' + params(selectOptions)
    };
    return backendSrv.datasourceRequest(requestOptions).then(function(result) {
      var data = [];
      var seriesSet = {};
      var select = result.data[1][0];
      var i;
      for (i = 2; i < select.length; i++) {
        var record = select[i];
        var timestamp = record[0];
        var value = record[1];
        var series = seriesSet[column];
        var datapoints;
        if (!series) {
          series = seriesSet[column] = {
            target: column,
            datapoints: []
          };
          data.push(series);
        }
        datapoints = series.datapoints;
        datapoints.push([value, timestamp * 1000]);
      }
      return {data: data};
    });
/*
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    return this.backendSrv.datasourceRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST',
      headers: this.headers
    });
*/
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/d/status',
      method: 'GET',
      headers: this.headers
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  annotationQuery(options) {
    var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    var annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query
      },
      rangeRaw: options.rangeRaw
    };

    return this.backendSrv.datasourceRequest({
      url: this.url + '/annotations',
      method: 'POST',
      headers: this.headers,
      data: annotationQuery
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(options) {
    var target = typeof (options) === "string" ? options : options.target;
    var interpolated = {
        target: this.templateSrv.replace(target, null, 'regex')
    };

    return this.backendSrv.datasourceRequest({
      url: this.url + '/search',
      data: interpolated,
      method: 'POST',
      headers: this.headers
    }).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i};
      }
      return { text: d, value: d };
    });
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }
}
