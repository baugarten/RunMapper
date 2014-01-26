$(function() {
  /**
   * Map Constants
   */
  var LAT = 50.91710
    , LNG = -1.40419
    , ZOOM = 13;

  var $ui = $("#ui")
    , $journey = $("#journey")
    , $mileage = $("#mileage")
    , $returnHome = $("#returnHome");

  function Map(el, lat, lng, zoom) {
    this.options = {
      zoom: zoom,
      center: new Map.api.LatLng(lat, lng),
      mapTypeId: Map.api.MapTypeId.ROADMAP,
      disableDefaultUI: true
    }; 
    this.map = new Map.api.Map(el, this.options);
    this.destinationCount = 0;
    this.destinations = [];
    this.renderer = new Map.api.DirectionsRenderer({ 'draggable': true });
    this.renderer.setMap(this.map);
    this.directions = new Map.api.DirectionsService(this.map);
  };

  Map.prototype.addMarker = function(lat, lng, options, el) {
    options = options || {};
    options.map = this.map;
    options.position = new Map.api.LatLng(lat, lng);

    return new Map.api.Marker(options);
  };

  Map.prototype.addDestination = function(latlng) {
    var _this = this
      , index = (this.destinations.push({
        latLng: latlng
      }) - 1)
      , dragEndHandler = this.markerDrag(index);

    if (index === 0) {
      this.firstMarker = this.addMarker(latlng.lat(), latlng.lng(), {
        flat: true,
        animation: Map.api.Animation.DROP,
        draggable: true,
      })
      Map.api.event.addListener(this.firstMarker, "click", function() {
        _this.addDestination(_this.destinations[0].latLng);
      });
    } else {
      this.firstMarker.setVisible(false);
    }

    dragEndHandler({
      latLng: latlng
    });
  };

  Map.prototype.markerDrag = function(index) {
    var _this = this;
    return function(ev) {
      Map.geocode(ev.latLng, function(results) {
        _this.destinations[index].geocoded = results[0];

        if (_this.destinations.length > 1) {
          _this.directions.route({ 
            'origin': _this.destinations[0].latLng,
            'waypoints': _this.generateWaypoints(),
            'destination': _this.destinations[_this.destinations.length - 1].latLng,
            'travelMode': Map.api.DirectionsTravelMode.WALKING
          }, function(res, sts) {
            var distance = 0
              , unit = "";
            res.routes[0].legs.forEach(function(leg) {
              var parts = leg.distance.text.match(/([^ ]*) ([^ ]*)/);
              distance += parseFloat(parts[1]);
              unit = unit || parts[2];
            });
            renderMileage(round_up(distance, 1) + " " + unit);
            if (sts === "OK") {
              _this.renderer.setDirections(res);
            } else if (sts === "MAX_WAYPOINTS_EXCEEDED") {
              alert("Sorry, you can't have more than 10 stops... blame google maps :(");
            } else {
              alert("This usually doesn't happen... maybe try refreshing the page?");
            }
          });
        }

        Map.api.event.trigger(_this.map, 'locationChange', ev.latLng);
      });
    };
  };

  Map.prototype.generateWaypoints = function() {
    var waypoints = [];
    for (var i = 1; i < this.destinations.length - 1; i++) {
      waypoints[i-1] = {
        location: this.destinations[i].latLng
      };
    }
    return waypoints;
  };

  Map.prototype.on = function() {
    Map.api.event.addListener.apply(Map.api.event, Array.prototype.concat.apply([this.map], arguments));
  };

  Map.api = google.maps;

  Map.geocode = function(latlng, cb) {
    new Map.api.Geocoder().geocode({
      "latLng": latlng
    }, cb);
  };

  var map = new Map(document.getElementById('map'), LAT, LNG, ZOOM);
  window.map = map;

  map.on('click', function(e) {
    map.addDestination(e.latLng);
  });
  map.on('locationChange', function(latlng) {
    if (map.destinations.length > 1) {
      $returnHome.show();
    } else {
      $returnHome.hide();
    }

    $journey.html("");
    map.destinations.forEach(function(destination) {
      $("<h3/>", {
        text: "Test"  
      }).appendTo($journey);
      $("<p />", {
        text: destination.geocoded.formatted_address,
        "data-latLng": destination.latLng
      }).appendTo($journey);
    });
    renderMileage();
  });

  var renderMileage = function(mileage) {
    if (mileage) {
      $mileage.html(mileage);
    } else {
      $mileage.html("0.0")
    }
  }

  $returnHome.click(function() {
    if (map.destinations.length > 1) {
      map.addDestination(map.destinations[0].latLng);
    }
  });

  $("#journeywrapper").css('maxHeight', $returnHome.offset().top - $journey.offset().top);

  function round_up( value, precision ) { 
    var pow = Math.pow ( 10, precision ); 
    return ( Math.ceil ( pow * value ) + Math.ceil ( pow * value - Math.ceil ( pow * value ) ) ) / pow; 
  }
});
