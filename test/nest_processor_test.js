const expect = require('chai').expect;
const main = require('../nest_processor');
const fs = require('fs');

const nestResponse = JSON.parse(fs.readFileSync(`${__dirname}/testResponse.json`, 'utf8'));

function stubResponse(key, value) {
  const stub = {
    devices: {
      thermostats: {
        'JZ-U65a4K6EKQmzsnTzFPbTE2K-T_Yco': {},
      },
    },
  };

  stub.devices.thermostats['JZ-U65a4K6EKQmzsnTzFPbTE2K-T_Yco'][key] = value;
  return stub;
}

describe('Nest processor', () => {
  it('should extract humidity', () => {
    const humidity = main.humidity(stubResponse('humidity', 55));
    expect(humidity).to.equal(55);
  });

  it('should extract target temperature', () => {
    const targetTemperature = main.targetTemperature(stubResponse('target_temperature_c', 21.5));
    expect(targetTemperature).to.equal(21.5);
  });

  it('should extract name', () => {
    const name = main.name(stubResponse('name', 'foobar'));
    expect(name).to.equal('foobar');
  });

  it('should extract ambient temperature', () => {
    const ambientTemperature = main.ambientTemperature(stubResponse('ambient_temperature_c', 20.5));
    expect(ambientTemperature).to.equal(20.5);
  });

  it('should give away status', () => {
    const awayStatus = main.awayStatus(nestResponse);
    expect(awayStatus).to.equal('home');
  });

  it('should give structure id', () => {
    const structureId = main.structureId(nestResponse);
    expect(structureId).to.equal('c-SEshyQhB7ft2mluyF3otVjI8WUnxDJpNaAd1gcaLCgvx8ogw5m-g');
  });

  it('should give thermostat id', () => {
    const thermostatId = main.thermostatId(nestResponse);
    expect(thermostatId).to.equal('JZ-U65a4K6EKQmzsnTzFPbTE2K-T_Yco');
  });

  it('should give if there is a leaf', () => {
    const hasLeaf = main.hasLeaf(nestResponse);
    expect(hasLeaf).to.equal(false);
  });

  it('should give the hvac state', () => {
    const heatingStatus = main.heatingState(nestResponse);
    expect(heatingStatus).to.equal('heating');
  });

  it('should give the time to target', () => {
    const timeToTarget = main.timeToTarget(nestResponse);
    expect(timeToTarget).to.equal('~0');
  });

  it('should give emergency heat status', () => {
    const isUsingEmergencyHeat = main.isUsingEmergencyHeat(nestResponse);
    expect(isUsingEmergencyHeat).to.equal(false);
  });
});
