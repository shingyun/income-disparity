//Basic settings
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
color_mean = '#FFFFFF';
dash = '3 1.5';
delay = 50;
r_min = 3;
r_max = 40;
clicks = 0;


//View setting defult
$('#btn-map').addClass('view-selected');

//Drawing
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

    var income_total = 0
    data.forEach(d => {
        income_total = income_total + d.INCOME
        income_arr.push(d.INCOME)
    })
    min = d3.min(income_arr)
    max = d3.max(income_arr)
    mean = Math.round(income_total/data.length)

    scaleR.domain([Math.sqrt(min),Math.sqrt(max)])
    scaleColor.domain([min,(min+max)/2,max])
    
    //sort data and arrange them from highest income to lowest
    data.sort(function(a,b){return b.INCOME-a.INCOME})
    nestedData = d3.nest().key(d => d.STATE)
        .sortKeys(d3.ascending)
        .entries(data);

    //Calculate the gap
    gap_arr = [];

    nestedData.forEach(function(d){
        var income_arr = [];
        d.values.forEach(function(e){
            income_arr.push(e.INCOME)     
        })
        gap_arr.push({
            state: d.key,
            gap: d3.extent(income_arr)[1] - d3.extent(income_arr)[0]
        })
    })

    gap_arr.sort(function (a,b) {
        return b.gap - a.gap
    })

    // State in the oder of gap
    state_by_gap = [];
    gap_arr.forEach(function(d){
        state_by_gap.push(d.state);
    })

    //nest data and sort by the gap order
    nestedDataByGap = d3.nest()
        .key(d => d.STATE)
        .sortKeys((a,b) => state_by_gap.indexOf(a)-state_by_gap.indexOf(b))
        .entries(data);    


    //// MAP ////
    var states = plot.selectAll('.state')
        .data(nestedDataByGap)
        .enter()
        .append('g')
        .attr('class','state')
        .attr('transform', function(d){

        	var x = d.values[0].X_POSITION*75+40, 
        	    y = d.values[0].Y_POSITION*70;
        	
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


////// Mean circle //////
    var states = plot.selectAll('.state-mean')
        .data(nestedDataByGap)
        .enter()
        .append('g')
        .attr('class','state-mean')
        .attr('transform', function(d){

            var x = d.values[0].X_POSITION*75+40, 
                y = d.values[0].Y_POSITION*70;
            
            return 'translate('+ x + ',' + y + ')';
        })
        .append('circle')
        .classed('mean', true)
        .attr('transform', d => {
            return 'translate(0,'+ (50-scaleR(Math.sqrt(mean))) +')';
        })
        .attr('r',d => scaleR(Math.sqrt(mean)))
        .style('stroke-width', (circle_stroke+1) + 'px')
        .style('stroke', color_mean)
        .style('fill','none')
        .style('stroke-dasharray',dash)



////// LEGEND //////
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
        },
        // {
        //   name: 'middle',
        //   value: ((min + 10000) + max)/2,
        //   text: ''
        // },
        {
          name: 'mean',
          value: mean,
          text: 'Average income'
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
        .style('stroke', d => {
            if(d.name == 'mean'){
                return color_mean
            } else {
                return scaleColor(d.value)
            }
        })
        .style('stroke-width','1.5px')
        .style('fill','none')
        .style('stroke-dasharray', d =>{
            if(d.name == 'mean'){
                return dash
            } else {
                return
            }
        })

    legend.selectAll('.legend-text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('class','legend-text')
        .attr('transform', d => {
            if(d.name == 'big'){
                return 'translate(150,20)'
            } else if (d.name == 'small') {
                return 'translate(150,140)'
            } else {
                return 'translate(150,80)'
            }
        })
        .text(d => d.text)
        .style('text-anchor','middle')
        .style('fill', d => {
            if(d.name == 'mean'){
                return color_mean
            } else {
                return scaleColor(d.value)
            }
        })


    //Show States btn
    $('#btn').click(function(){
          if (clicks%2 == 0){

                d3.selectAll('.state-abb')
                  .style('visibility','visible')
                  .transition().duration(500)
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


    // Views setting
    $('#btn-map').click(function(){
        $('.view-selected').removeClass('view-selected')
        $('#btn-map').addClass('view-selected')
        
        plot.selectAll('.state')
            .transition()
            .delay((d,i) => i%10 * delay)
            .duration(1000)
            .attr('transform', function(d){

                var x = d.values[0].X_POSITION*75+40, 
                    y = d.values[0].Y_POSITION*70;
                            
                return 'translate('+ x + ',' + y + ')';
        })

        plot.selectAll('.state-mean')
            .transition()
            .delay((d,i) => i%10 * delay)
            .duration(1000)
            .attr('transform', function(d){

                var x = d.values[0].X_POSITION*75+40, 
                    y = d.values[0].Y_POSITION*70;
                
                return 'translate('+ x + ',' + y + ')';
        })


    });

    $('#btn-gap').click(function(){
        $('.view-selected').removeClass('view-selected')
        $('#btn-gap').addClass('view-selected')

        plot.selectAll('.state')
            .transition()
            .delay((d,i) => i%10 * delay)
            .duration(1000)
            .attr('transform', function(d,i){

                var x = i%8*90+150, 
                    y = Math.floor(i/8)*80+20;
                            
                return 'translate('+ x + ',' + y + ')';
        })


        plot.selectAll('.state-mean')
            .transition()
            .delay((d,i) => i%10 * delay)
            .duration(1000)
            .attr('transform', function(d,i){

                var x = i%8*90+150, 
                    y = Math.floor(i/8)*80+20;
                            
                return 'translate('+ x + ',' + y + ')';
        })

    });



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

