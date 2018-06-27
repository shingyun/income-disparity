window_h = $(window).height();
window_w = $(window).width();
map_top = $('#map').offset().top;
svg_w = 1000;
svg_h = 650;
circle_stroke = 1;
circle_stroke_mouse = 3;
color_low = '#4A8AA1';
color_mid = '#A4E482';
color_high ='#E8DE60';
color_bg = '#222222';
r_min = 3;
r_max = 40;
clicks = 0;

var plot = d3.select('#map')
    .append('svg')
    .attr('width', svg_w + 'px')
    .attr('height', svg_h + 'px')
      .append('g')
      .attr('transform','translate(50,50)')

var legend = d3.select('#intro-legend')
    .append('svg')
    .attr('width','300px')
    .attr('height','150px')
       .append('g')
       .attr('tranform','translate(0,0)')

var scaleR = d3.scaleLinear()
    .range([r_min,r_max]);

var scaleColor = d3.scaleLinear()
    // .range(['#77B3D9','#A58CBB','#B46A87'])
    .range([color_low, color_mid, color_high])

var format = d3.format('$,');

var income_arr = [];

d3.queue()
  .defer(d3.csv,'income_pos.csv', parse)
  .await(dataloaded)

function dataloaded(err, data) {

	console.log(data)

    data.forEach(d => income_arr.push(d.INCOME))
    min = d3.min(income_arr)
    max = d3.max(income_arr)


    scaleR.domain([Math.sqrt(min),Math.sqrt(max)])
    scaleColor.domain([min,(min+max)/2,max])

    
    data.sort(function(a,b){return b.INCOME-a.INCOME})
    nestedData = d3.nest().key(d => d.STATE)
        .entries(data);


    //// LEGEND ////
    legendData = 
    [
	    { 
	      name: 'big',
	      value: max,
	      text: 'Higher-income County'
	    },{
	      name: 'small',
	      value: min + 10000,
	      text: 'Lower-income County'
	    },{
	      name: 'middle',
	      value: ((min + 10000) + max)/2,
	      text: ''
	    }
	]

    legend.selectAll('.legend-circle')
        .data(legendData)
        .enter()
        .append('circle')
        .attr('class','legend-circle')
        .attr('transform',d => {
        	return 'translate(150,'+ (120-scaleR(Math.sqrt(d.value))) + ')';
        })
        .attr('r', d => scaleR(Math.sqrt(d.value)))
        .style('stroke', d => scaleColor(d.value))
        .style('stroke-width','1.5px')
        .style('fill','none')

    legend.selectAll('.legend-text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('class','legend-text')
        .attr('transform', d => {
        	if(d.name == 'big'){
        		return 'translate(150,20)'
        	} else {
        		return 'translate(150,140)'
        	}
        })
        .text(d => d.text)
        .style('text-anchor','middle')
        .style('fill', d => scaleColor(d.value))


    //// MAP ////
    var states = plot.selectAll('.state')
        .data(nestedData)
        .enter()
        .append('g')
        .attr('class','state')
        .attr('transform', function(d){

        	var x = d.values[0].X_POSITION*75+40, 
        	    y = d.values[0].Y_POSITION*75;
        	
        	return 'translate('+ x + ',' + y + ')';
        })

    var counties = states.selectAll('.county')
        .data(d => d.values)
        .enter()
        .append('circle')
        .attr('id', d => {
        	var spe = d.COUNTY_ID+d.STATE_ABB
        	return 'county' + spe;
        })
        .classed('county', true)
        .attr('transform', d => {
        	return 'translate(0,'+ (50-scaleR(Math.sqrt(d.INCOME))) +')';
        })
        .attr('r', d => scaleR(Math.sqrt(d.INCOME)))
        .style('stroke-width', circle_stroke + 'px')
        .style('stroke', d => scaleColor(d.INCOME))
        .style('fill', color_bg)
        .on('mouseover', d => {
	        //Tooltip //
            var tooltip = d3.select('#tooltip')
                .style('visibility','visible');

            var x = d3.event.pageX, y = d3.event.pageY

            if(x > window_w/2){
            	tooltip
            	.style('left',(d3.event.pageX-190) + 'px')
            } else {
            	tooltip
            	.style('left',(d3.event.pageX+20) + 'px')
            }

            if(y > (map_top + (svg_h/1.75))){
            	tooltip
                .style('top',(d3.event.pageY-100) + 'px')
            } else {
            	tooltip
                .style('top',(d3.event.pageY+40) + 'px')            	
            }

	        d3.select('#tooltip-state')
	          .html(d.STATE);
	        d3.select('#tooltip-county')
	          .html(d.COUNTY);
	        d3.select('#tooltip-income')
	          .html(format(d.INCOME)); 
            
            //circle style//
	        var spe = d.COUNTY_ID+d.STATE_ABB
	        d3.select('#county'+spe)
	          .style('stroke', '#FFFFFF')
	          .style('stroke-width',circle_stroke_mouse + 'px');
	    })
	    .on('mouseleave', d => {
	    	//circle style//
	        var spe = d.COUNTY_ID+d.STATE_ABB
	        d3.select('#county'+spe)
	          .style('stroke', scaleColor(d.INCOME))
	          .style('stroke-width',circle_stroke + 'px');
	    })
    
    states.on('mouseleave', function(){
    	d3.select('#tooltip')
    	  .style('visibility', 'hidden');
    })

    states.append('text')
          .attr('class', 'state-abb')
          .text(function(d){return d.values[0].STATE_ABB})
          .attr('transform','translate(0,30)')
          .style('visibility','hidden')
          .style('opacity', 0)


    $('#btn').click(function(){
          if (clicks%2 == 0){

                d3.selectAll('.state-abb')
                  .style('visibility','visible')
                  .transition(1000)
                  .style('opacity',1)
                  .attr('transform','translate(0,10)');

                d3.select('#btn')
                  .html('Hide States');

          } else {
                d3.selectAll('.state-abb')
                  .classed('showing',false)
                  .style('opacity',0)
                  .style('visibility','hidden')
                  .attr('transform','translate(0,30)');   

                d3.select('#btn')
                  .html('Show States');
          }
          ++clicks;
    })

}


function parse(d){

	return {
	    STATE: d.STATE,
		STATE_ID: d.STATEA,
		COUNTY: d.COUNTY,
		COUNTY_ID: d.COUNTYA,
		INCOME: +d.AF49E001,
		STATE_ABB: d.STATE_ABB,
		X_POSITION: +d.X_POSITION,
		Y_POSITION: +d.Y_POSITION
    }
}

