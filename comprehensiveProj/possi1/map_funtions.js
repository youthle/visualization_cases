function draw_map (map_dim, map_projection, map_path, map_svg_id, palette, json_data, x_var, y_var) {	
	
	var map_data=json_data.health_data;
	
	//assign dimensions
	d3.select("#"+map_svg_id)
		.attr("width", map_dim.width + (map_dim.margin.left + map_dim.margin.right))
		.attr("height", map_dim.height + (map_dim.margin.top + map_dim.margin.bottom))
	
	//remove old svg nodes
	d3.select("#"+map_svg_id).selectAll("g").remove();
	
	//add svg elements
	var map_g = d3.select("#"+map_svg_id).append('g').attr("id", "map_g");
	
	var map = map_g.append('g').attr("transform", "translate(" + 0 + "," + map_dim.margin.top + ")");

    var geo_entity = map.append("g").attr("class", "geo_entity");

    var openspace = map.append("g").attr("class", "openspace");

    var boroughs = map.append("g").attr("class", "boroughs");

    var geo_entity_hover = map.append("g");

	//scales for map	
	var y_quantile = (!y_var) ? "" : d3.scale.quantile().domain($.map(map_data, function (g) { return g[y_var]; })).range([0, 1, 2]);
	
	var x_quantile = d3.scale.quantile().domain($.map(map_data, function (g) { return g[x_var]; })).range([0, 1, 2]);
		
		
	$.getJSON(spatial, function (json) {
		
		//set the projection 
		set_projection(map_projection, map_path, json, map_dim.width, map_dim.height);
		
		openspace.selectAll("path")
			.data(json.features.filter(function (d) { return d.id == 0; }))
			.enter().append("path")
				.attr("d", map_path)
				.attr("pointer-events", "none");
			
		geo_entity.selectAll("path")
			.data(json.features.filter(function (d) { return d.id > 0; }))
			.enter().append("path")
			.attr("d", map_path)
			.style("fill", function(d) { 
				var test_hdata = $.map(map_data.filter(function (dd) { return dd.geo_id == d.id; }), function (g) { return g; });
				return (!y_var)?palette[x_quantile(test_hdata[0][x_var])]:palette[y_quantile(test_hdata[0][y_var])][x_quantile(test_hdata[0][x_var])];
			});
			
			//load borough boundaries
			$.getJSON(boroJSON, function (b_json) {
				boroughs.selectAll("path")
					.data(b_json.features)
					.enter().append("path")
						.attr("d", map_path)
						.attr("pointer-events", "none");		
			
				geo_entity_hover.selectAll("path")
					.data(json.features.filter(function (d) { return d.id > 0; }))
					.enter().append("path")
						.attr("class", "UHF_out")
						.attr("id", function (d) { return "UHF_" + d.id; })
						.attr("d", map_path)
						.attr("title", function(d) { return d.properties.GEONAME; })
						.on("mouseover", function(d,i){
							d3.selectAll("#pt_" + d.id).style("fill", "rgb(0,255,255)").attr("r", 5);	
							//d3.select(this).attr("class", "UHF_over");
							d3.selectAll("#UHF_" + d.id).attr("class", "UHF_over");
						})
						.on("mouseout", function(d){
							d3.selectAll("#pt_" + d.id).style("fill", "rgb(0,0,0)").attr("r", 3);
							//d3.select(this).attr("class", "UHF_out");
							d3.selectAll("#UHF_" + d.id).attr("class", "UHF_out");
						});
			
			 }); //close borough boundary JSON
        
	}); //close geo_entity JSON
	
	//add legend
	var svg_legend = map_g.append("g").attr("class", "svg_legend").attr("transform", "translate(" + map_dim.legend.left + "," +  map_dim.legend.top + ")");
	var tick_size = 20;
	//scales for first variable... used by both map types
	var x_ticks=x_quantile.quantiles().slice(0);
			x_ticks.unshift(d3.min($.map(map_data, function (g) { return parseFloat(g[x_var]); })));
			x_ticks.push(d3.max($.map(map_data, function (g) { return parseFloat(g[x_var]); })));
	
	var x = d3.scale.linear()
			.domain([x_ticks[0], x_ticks[x_ticks.length-1]])
			.range([ 0, map_dim.legend.width ]);
	
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient('bottom')
		.tickValues(x_ticks)
		.tickFormat(d3.format('.1f'))
		.tickSize(-(map_dim.legend.height+tick_size),0,0)
		.tickPadding([25]);
			
	
	//json_data.fields
	var x_field = $.map(json_data.fields.filter(function (dd) { return dd.dataset == x_var; }), function (g) { return g; });
	//console.log(test_field);
			
	if (!y_var) {
		
		
		var swatch=(!map_dim.legend.dim)?30:map_dim.legend.dim;
		var leg_orient =(!map_dim.legend.orientation)?"vertical":(map_dim.legend.orientation);
		
		xAxis.tickSize(-(swatch+tick_size),0,0);
		
		if (leg_orient=="vertical"){
			x.range([map_dim.legend.height, 0]);
			xAxis.orient('left');
		}	
		
		svg_legend
			.selectAll("row")
			.data(palette)
			.enter().append("rect")
				.attr("height", function(d, i) { return (leg_orient=="vertical")?x(x_ticks[i])-x(x_ticks[i+1]):swatch;})
				.attr("width", function(d, i) { return (leg_orient=="horizontal")?x(x_ticks[i+1])-x(x_ticks[i]):swatch;})
				.attr("y", function(d, i){ return (leg_orient=="vertical")?x(x_ticks[i+1]):swatch;})
				.attr("x", function(d, i){ return (leg_orient=="horizontal")?x(x_ticks[i]):swatch;})
				.style("fill",function(d){ return d;});
		
		svg_legend.append('g')
			.attr('transform', (leg_orient=="horizontal")?'translate(0,' + swatch*2 + ')':'translate(' + swatch + ',0)')
			.attr('class', 'axis')
			.call(xAxis)
			.selectAll(".tick line").attr("transform", (leg_orient=="horizontal")?"translate(0,"+tick_size+")":"translate(-"+tick_size+",0)");
		
		//add line
		svg_legend.append('line')
			.attr("class", "legend_line")
			.attr("x1", function(d, i){ return (leg_orient=="horizontal")?0:swatch*2;})
			.attr("y1", function(d, i){ return (leg_orient=="vertical")?0:swatch;})
			.attr("x2", function(d, i){ return (leg_orient=="horizontal")?map_dim.legend.width:swatch*2;})
			.attr("y2", function(d, i){ return (leg_orient=="vertical")?map_dim.legend.height:swatch;});
		
		map_g.append("text")
			.attr("class", "x label")
			.attr("text-anchor", "middle")
			.attr("x", map_dim.width/2)
			.attr("y",map_dim.margin.top)
			.text(x_field[0].Indicator + " (" + x_field[0].Measure + "), " +  x_field[0].Year);
		
	}
	
	else {
		
		var y_field = $.map(json_data.fields.filter(function (dd) { return dd.dataset == y_var; }), function (g) { return g; });
		
		var y_ticks=y_quantile.quantiles().slice(0);
			y_ticks.unshift(d3.min($.map(map_data, function (g) { return parseFloat(g[y_var]); })));
			y_ticks.push(d3.max($.map(map_data, function (g) { return parseFloat(g[y_var]); })));
	
		var y = d3.scale.linear()
			.domain([y_ticks[0], y_ticks[y_ticks.length-1]])
			.range([ map_dim.legend.height, 0 ]);
	
		
		 	
		var yAxis = d3.svg.axis()
			.scale(y)
			.orient('left')
			.tickValues(y_ticks)
			.tickFormat(d3.format('.1f'))
			.tickSize(-(map_dim.legend.width+tick_size),0,0)
			.tickPadding([25]);
	
		svg_legend
			.selectAll("row")
			.data(palette)
			.enter().append("g")
				.selectAll("cell")
					.data(function(d, i) { return d; })
					.enter().append("rect")
						.attr("width", function(d, i, j) { return x(x_ticks[i+1])-x(x_ticks[i]); })
						.attr("height", function(d, i, j) { return y(y_ticks[j])-y(y_ticks[j+1]); })
						.attr("y", function(d, i, j){ return y(y_ticks[j+1]);})
						.attr("x", function(d, i, j){ return x(x_ticks[i]);})
						.style("fill",function(d){ return d;});
	
		svg_legend.append('g')
			.attr('transform', 'translate(0,' + map_dim.legend.height + ')')
			.attr('class', 'axis')
			.call(xAxis)
			.selectAll(".tick line").attr("transform", "translate(0,"+tick_size+")");
		

		
		svg_legend.append("text")
			.attr("class", "x label")
			.attr("text-anchor", "middle")
			.attr("x", map_dim.legend.width/2)
			.attr("y", -tick_size)
			.text(x_field[0].Indicator + " (" + x_field[0].Measure + "), " +  x_field[0].Year);
		
		svg_legend.append('g')
			.attr('transform', 'translate(0,0)')
			.attr('class', 'axis')
			.call(yAxis)
			.selectAll(".tick line").attr("transform", "translate(-"+tick_size+",0)");		
	
	
		svg_legend.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "middle")
			.attr("y", 0)
			.attr("x", 0)
			.attr('transform', 'translate(' + (map_dim.legend.width+tick_size) + ',' + (map_dim.legend.height+tick_size)/2 + ') rotate(90)')
			.text(y_field[0].Indicator + " (" + y_field[0].Measure + "), " +  y_field[0].Year);
	
	
		svg_legend.append('g')
			.selectAll("scatter-dots")
			.data(map_data)
			.enter().append("svg:circle")
				.attr("cy", function (d,i) { return y(d[y_var]); } )
				.attr("cx", function (d,i) { return x(d[x_var]); } )
				.attr("r", 3)
				.attr("id", function (d) { return "pt_" + d.geo_id; })
				.on("mouseover", function(d,i){
					d3.select(this).style("fill", "rgb(0,255,255)").attr("r", 5);
					d3.selectAll("#UHF_" + d.geo_id).attr("class", "UHF_over");	
				})
				.on("mouseout", function(d){
					d3.select(this).style("fill", "rgb(0,0,0)").attr("r", 3);
					d3.selectAll("#UHF_" + d.geo_id).attr("class", "UHF_out");
				});
	}

	//}); //close health data
	

}

function set_projection(projection, path, json, map_width, map_height) {

    //reset projection
    projection
		.scale(1)
		.translate([0, 0]);

    //adjust projection to zoom in on NYC
    var this_c = d3.geo.centroid(json);

    //first rotate projection to NYC
    projection
		.rotate([(this_c[0] * -1), 0])
		.center([0, this_c[1]])
		.precision(.1);

    var b = path.bounds(json),
	s = .95 / Math.max((b[1][0] - b[0][0]) / map_width, (b[1][1] - b[0][1]) / map_height),
	t = [(map_width - s * (b[1][0] + b[0][0])) / 2, (map_height - s * (b[1][1] + b[0][1])) / 2];

    //then set scale and center
    projection
		.scale(s)
		.translate(t);
		
}