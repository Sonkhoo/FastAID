import * as maptilersdk from '@maptiler/sdk';

maptilersdk.config.apiKey = 'YOUR_MAPTILER_API_KEY_HERE';
const map = new maptilersdk.Map({
  container: 'map', // container's id or the HTML element to render the map
  style: maptilersdk.MapStyle.STREETS,
});

export default map;
