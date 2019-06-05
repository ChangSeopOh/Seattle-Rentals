mapboxgl.accessToken = 'pk.eyJ1Ijoia2kzMjExMjMiLCJhIjoiY2p3YmEwNDdlMDBpbDQzcHNyNmJlcmJsbiJ9.d6uXAZ5T3iIDa9zwbScUMg';

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: post.geometry.coordinates,
  zoom: 5
});

//create a HTML element for the post location/marker
var el = document.createElement('div');
el.className = 'marker';

// make a marker for our location and add to the map
new mapboxgl.Marker(el)
.setLngLat(post.geometry.coordinates)
.setPopup(new mapboxgl.Popup({ offset: 25 }) // add popups
.setHTML('<h3>' + post.title + '</h3><p>' + post.location + '</p>'))
.addTo(map);


// Toggle edit review form
$('.toggle-edit-form').on('click',function(){
	// Toggle the edit button text on click
	$(this).text() === 'Edit' ? $(this).text('Cancel') : $(this).text('Edit');
	// Toggle visibility of the edit review form
	//siblings only allow you to toggle that you want, if you don't use this, then all of reviews toggled
	$(this).siblings('.edit-review-form').toggle();

});


//Add click listener for clearning of rating from edit/new form
$('.clear-rating').click(function(){
	$(this).siblings('.input-no-rate').click();
	
});
