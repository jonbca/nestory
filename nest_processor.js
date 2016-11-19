const get = require('lodash.get');
const keys = require('lodash.keys');

function thermostatId(body) {
  const thermostatMap = get(body, ['devices', 'thermostats']);

  return keys(thermostatMap)[0];
}

function thermostatProperty(property) {
  return (body) => {
    const id = thermostatId(body);

    return get(body, ['devices', 'thermostats', id, property]);
  };
}

function structureProperty(property) {
  return (body) => {
    const structureId = keys(body.structures)[0];

    return get(body, ['structures', structureId, property]);
  };
}

module.exports = {
  humidity: thermostatProperty('humidity'),
  targetTemperature: thermostatProperty('target_temperature_c'),
  name: thermostatProperty('name'),
  ambientTemperature: thermostatProperty('ambient_temperature_c'),
  awayStatus: structureProperty('away'),
  structureId: structureProperty('structure_id'),
  thermostatId: thermostatProperty('device_id'),
  hasLeaf: thermostatProperty('has_leaf'),
  heatingState: thermostatProperty('hvac_state'),
  timeToTarget: thermostatProperty('time_to_target'),
  isUsingEmergencyHeat: thermostatProperty('is_using_emergency_heat'),
};
