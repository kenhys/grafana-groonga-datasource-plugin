import {GroongaDatasource} from './datasource';
import {GroongaQueryCtrl} from './query_ctrl';

class GroongaConfigCtrl {}
GroongaConfigCtrl.templateUrl = 'partials/config.html';

export {
  GroongaDatasource as Datasource,
  GroongaQueryCtrl as QueryCtrl,
  GroongaConfigCtrl as ConfigCtrl
};
