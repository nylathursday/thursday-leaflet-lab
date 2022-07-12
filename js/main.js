/* javascript by Nyla Thursday, 2022*/
/* Map of GeoJSON data from WomenParliament.geojason */

//function to instantiate the Leaflet map
function createMap() {
  //create the map
  var map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  //add OSM base tilelayer
  L.tileLayer("http://stamen-tiles-b.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);

  //call getData function
  getData(map);
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
  //scale factor to adjust symbol size evenly
  var scaleFactor = 50;
  //area based on attribute value and scale factor
  var area = attValue * scaleFactor;
  //radius calculated based on area
  var radius = Math.sqrt(area / Math.PI);

  return radius;
};

//Popup constructor function
function Popup(properties, attribute, layer, radius){
  this.properties = properties;
  this.attribute = attribute;
  this.layer = layer;
  this.year = attribute.split("_")[1];
  this.percent = this.properties[attribute];
  this.content = "<p><b>Country:</b> " + this.properties.Country + "</p><p><b>Proportion of seats held by women in national parliament, " + this.year + ":</b> " + this.percent + "%</p>";

  this.bindToLayer = function(){
      this.layer.bindPopup(this.content, {
          offset: new L.Point(0,-radius)
      });
  };
};


//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {
  //Assign the current attribute based on the first index of the attributes array
  var attribute = attributes[0];

  //create marker options
  var options = {
    fillColor: "#9EAD24",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  };

  //For each feature, determine its value for the selected attribute
  var attValue = Number(feature.properties[attribute]);

  //Give each feature's circle marker a radius based on its attribute value
  options.radius = calcPropRadius(attValue);

  //create circle marker layer
  var layer = L.circleMarker(latlng, options);

  //create new popup
  var popup = new Popup(feature.properties, attribute, layer, options.radius);
  //add popup to circle marker
  popup.bindToLayer();

  //event listeners to open popup on hover
  layer.on({
    mouseover: function () {
      this.openPopup();
    },
    mouseout: function () {
      this.closePopup();
    },
  });

  //return the circle marker to the L.geoJson pointToLayer option
  return layer;
}

//build an attributes array from the data
function processData(data) {
  //empty array to hold attributes
  var attributes = [];

  //properties of the first feature in the dataset
  var properties = data.features[0].properties;

  //push each attribute name into attributes array
  for (var attribute in properties) {
    //only take attributes with percent values
    if (attribute.indexOf("Perc") > -1) {
      attributes.push(attribute);
    };
  };

  return attributes;
};


//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes) {
  //create a Leaflet GeoJSON layer and add it to the map
  L.geoJson(data, {
    pointToLayer: function (feature, latlng) {
      return pointToLayer(feature, latlng, attributes);
    },
  }).addTo(map);
}

function updatePropSymbols(map, attribute) {
  map.eachLayer(function(layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      //access feature properties
      var props = layer.feature.properties;

      //update each feature's radius based on new attribute values
      var radius = calcPropRadius(props[attribute]);
      layer.setRadius(radius);

      //create new pop up for each year
      var popup = new Popup(props, attribute, layer, radius);

      popup.bindToLayer();
    };
  });

  updateLegend(map, attribute);
};

function createLegend(map, attributes){

  var LegendControl = L.Control.extend({
      options: {
          position: 'bottomright',
      },

      onAdd: function (map) {
          // create the control container with a particular class name
          var container = L.DomUtil.create('div', 'legend-control-container');

          //add temporal legend div to container
          $(container).append('<div id="temporal-legend">')

          //Step 1: start attribute legend svg string
          var svg = '<svg id="attribute-legend" width="160px" height="60px">';

          //array of circle names to base loop on
          var circles = {
            max: 20,
            mean: 40,
            min: 60
        };

          //Step 2: loop to add each circle and text to svg string
          for (var circle in circles){
            //circle string
            svg += '<circle class="legend-circle" id="' + circle + 
            '" fill="#9EAD24" fill-opacity="0.8" stroke="#000000" cx="30"/>';

              //text string
            svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
          };

        //close svg string
        svg += "</svg>";

          //add attribute legend svg to container
          $(container).append(svg);

          return container;
      }
  });

  map.addControl(new LegendControl());
  updateLegend(map, attributes[0]);
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
  //start with min at highest possible and max at lowest possible number
  var min = Infinity,
      max = -Infinity;

  map.eachLayer(function(layer){
      //get the attribute value
      if (layer.feature){
          var attributeValue = Number(layer.feature.properties[attribute]);

          //test for min
          if (attributeValue < min){
              min = attributeValue;
          };

          //test for max
          if (attributeValue > max){
              max = attributeValue;
          };
      };
  });

  //set mean
  var mean = (max + min) / 2;

  //return values as an object
  return {
      max: max,
      mean: mean,
      min: min
  };
};

//update legend with new attribute
function updateLegend(map, attribute){
  //create content for legend
  var year = attribute.split("_")[1];
  var content = "Proportion in " + year;

  //replace legend content
  $('#temporal-legend').html(content);

  //get the max, mean, and min values as an object
  var circleValues = getCircleValues(map, attribute);
  for (var key in circleValues){
    //get the radius
    var radius = calcPropRadius(circleValues[key]);

    //Step 3: assign the cy and r attributes
    $('#'+key).attr({
        cy: 59 - radius,
        r: radius
    });

     //Step 4: add legend text
     $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + "%");
}};

//Create new sequence controls
function createSequenceControls(map, attributes) {
  var SequenceControl = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function (map) {
        // create the control container div with a particular class name
        var container = L.DomUtil.create('div', 'sequence-control-container');

        //create range input element (slider)
         $(container).append('<input class="range-slider" type="range">');

        //add skip buttons
         $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
         $(container).append('<button class="skip" id="forward" title="Forward">Skip</button>');

        //disable any mouse event listeners for the container
        L.DomEvent.disableClickPropagation(container);

        return container;
    }
});

map.addControl(new SequenceControl());
  //REMOVED slider in panel (could put filter buttons here if that works)
  // //create range input element (slider)
  // $("#panel").append('<input class="range-slider" type="range">');

  //set slider attributes
  $(".range-slider").attr({
    max: 8,
    min: 0,
    value: 0,
    step: 1,
  });

  //add skip buttons
	$('#reverse').html('<img src="img/reverse.png">');
	$('#forward').html('<img src="img/forward.png">');

  //click listener for buttons
  $(".skip").click(function () {
    //get the old index value
    var index = $(".range-slider").val();

    //increment or decrement depending on button clicked
    if ($(this).attr("id") == "forward") {
      index++;
      //if past the last attribute, wrap around to first attribute
      index = index > 8 ? 0 : index;
    } else if ($(this).attr("id") == "reverse") {
      index--;
      //if past the first attribute, wrap around to last attribute
      index = index < 0 ? 8 : index;
    };

    //update slider
    $(".range-slider").val(index);
    //pass new attribute to update symbols
    updatePropSymbols(map, attributes[index]);
  });
	//Input listener for slider
	$('.range-slider').on('input', function(){
		//get the new index value
		var index = $(this).val();

		//pass new attribute to update symbols
		updatePropSymbols(map, attributes[index]);
	});

};

//Import GeoJSON data
function getData(map) {
  //load the data
  $.ajax("data/WomenParliament.geojson", {
    dataType: "json",
    success: function (response) {
      //create an attributes array
      var attributes = processData(response);
      //call function to create proportional symbols
      createPropSymbols(response, map, attributes);
      createSequenceControls(map, attributes);
      createLegend(map, attributes);

      //add in search function
      var searchLayer = L.layerGroup().addTo(map);
      //... adding data in searchLayer ...
      map.addControl( new L.Control.Search({layer: searchLayer}) );
      //stuck trying to make search function go through attributes

    },
  });
}

$(document).ready(createMap);
