/**
 * @fileOverview entry point for application
 * @author Adam Harpur
 * @version 1.0
 * @requires d3
 * @requires d3-geo
 * @requires d3-geo-projection
 * @requires topojson
 * @requires UI
 * @requires Ajax
 */
// pulling the style sheet to be bundled
require("./styles.scss");
// modules
import Ajax from "./modules/Ajax.js";
import UI from "./modules/UI.js";

// 3rd party
import * as d3Geo from "d3-geo";
import * as d3GeoPro from "d3-geo-projection";
import * as d3 from "d3";
import * as topojson from "topojson-client";

// Instance variables
const ui = new UI();
const ajax = new Ajax();

// set up params to be passed to the ajax module
let opts = {
  url: "https://datavis.online/map",
  method: "GET"
};

// request the data and fire main function passing in the response
ajax.send(opts).then(res => {
  main(res);
});

/**
 * @desc main function
 * @param {string} res Stringified JSON response from XHR request
 * @fires render()
 */
function main(res) {
  if (typeof res == "string") {
    // Config
    var worldData = res,
      width = 700,
      height = 700,
      focused;

    // Orthopgraphic the study of elevated terrain
    var projection = d3
      .geoOrthographic()
      .scale(245)
      .rotate([0, 0])
      .translate([width / 2, height / 2])
      .clipAngle(90);

    // Geographical path

    var path = d3.geoPath().projection(projection);

    // SVG container

    var svg = d3
      .select("body")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Water datum is binding the data to one svg element representing the water
    svg
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "water")
      .attr("d", path);

    // rendering the globe
    render(worldData, svg, path, projection);
  } else {
    console.log(`data is not formatted correctly`);
  }
}

/**
 * @param {string} world_json Stringified JSON response from XHR request
 * @param {function} projection D3 function that handles the map projection
 * @param {object} svg D3 object that contains the drawn svg
 * @param {function} path D3 Geo Path Data Generator helper class for generating SVG Path instructions from GeoJSON data
 *
 */
function render(world_json, svg, path, projection) {
  // getting the tooltips ready

  var sens = 0.25,
    velocity = 0.0075,
    stopBtn = UI._("input[rel=stop]"),
    stopped = false,
    then = (then = Date.now());

  stopBtn[0].addEventListener("click", () => {
    if (stopped) {
      stopBtn[0].value = "Start";
    } else {
      stopBtn[0].value = "Stop";
    }
    stopped = !stopped;
  });

  var countryTooltip = d3
      .select("body")
      .append("div")
      .attr("class", "country_tooltip"),
    countryList = d3
      .select("#controls")
      .append("select")
      .attr("name", "countries");

  // parse the data
  let root = JSON.parse(world_json);

  var countryById = {},
    countryData = counrtyListMake(root[0]);
  var countries = topojson.feature(
    root[0],
    root[0].objects.national_animals_map
  );

  console.log(countryData);
  // fill up the options for the dropdown list and grab ids
  countryData.forEach(d => {
    countryById[d.id] = d.name;
    console.log(d.name);
    var option = countryList.append("option");
    option.text(d.name);
    option.property("value", d.id);
  });

  // draw paths and the countries
  var world = svg
    .selectAll("path.land")
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "land")
    .attr("d", path);

  var land = topojson.feature(root[0], root[0].objects.national_animals_map),
    globe = { type: "Sphere" };

  svg
    .insert("path")
    .datum(land)
    .attr("class", "land")
    .attr("d", path);

  var group = svg
    .selectAll("g")
    .data(land.features)
    .enter()
    .append("g");

  var landMass = group
    .append("path")
    .attr("d", path)
    .attr("class", "country")
    .attr("fill", "steelblue");

  // add tooltip attribites on x and y
  group
    .attr("x", d => {
      return path.centroid(d)[0];
    })
    .attr("y", d => {
      return path.centroid(d)[1];
    })
    .on("mouseover", d => {
      ui.renderInfo(d);
      countryTooltip
        .transition()
        .duration(200)
        .style("opacity", 0.9);
      countryTooltip
        .html(d.properties.country + "</br>")
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY - 28 + "px");
    })
    .on("mouseout", d => {
      ui.clearInfo();
      countryTooltip
        .transition()
        .duration(1500)
        .style("opacity", 0);
    });

  // Draw Loop
  d3.timer(function() {
    var range = UI._("#speed");
    stopped ? (velocity = range[0].value / 1000) : (velocity = 0);
    var angle = velocity * (Date.now() - then);
    projection.rotate([angle, 0, 0]);
    svg.selectAll("path").attr("d", path.projection(projection));
  });
}

/**
 *
 *
 * @param {JSON} data
 * @returns {Array} the extracted country list from the data set
 */
function counrtyListMake(data) {
  var list = [];
  var countries = data.objects["national_animals_map"].geometries;
  countries.forEach(d => {
    let obj = {};
    obj.name = d.properties.country;
    list.push(obj);
  });
  return list;
}
