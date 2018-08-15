/* global d3:false */
// Revealing module pattern
var MAP = (function() {
    'use strict';

    var URL = 'data/dwp.json';
    var srcPath = 'https://web-beta.archive.org/web/';
    var srcURL = 'http://dwp.gov.uk';

    var months = [null, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var abbrevMonths = [null, 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    var model;
    var BASE_YR = 1996;

    var width = 2000;
    var height = 1220;

    var svg;
    var baseLayer;
    var markerLayer;
    var zoomLayer;

    var box = { w: 10, h: 20 };
    var spacing = { x: 11, y: 32 };
    var margin = { top: 20, left: 150 };
    var strokeColour = '#aaa';
    var highlightColour = '#ccc';
    var tooltip;
    var filterList = {}; // dictionary for tooltip refs
    var startBrushPosn;
    var endBrushPosn;
    var brush;
    
    var totalYears = 22;

    var colours = {
        '404': '#E21E26',
        'major': '#4A90E2',
        'minor': '#8EB8EA',
        'none': '#B2D234',
        'redir': '#8781BD',
        'revisit': '#21B784',
        'screenshot': '#4DB848'
    };
    var lines = {
        '404': 1,
        'major': 2,
        'minor': 3,
        'none': 4,
        'redir': 5,
        'revisit': 6,
        'screenshot': 7
    };
    var fullTitles = {
        '404': 'Page Not Found',
        'major': 'Major Change',
        'minor': 'Minor Change',
        'none': 'Unchanged',
        'redir': 'Redirect',
        'revisit': 'Revisit',
        'screenshot': 'Screenshots'
    };




    function dateToRange(date) {
        var yr = parseInt(date.substr(0, 4)) - BASE_YR;
        var mn = parseInt(date.substr(4, 2));
        var day = parseInt(date.substr(6, 2));

        return { yr: yr, mn: mn, day: day };
    }



    function formatDate(date) {
        var temp = dateToRange(date);
        if (temp.mn < 10) {
            temp.mn = '0' + temp.mn;
        }
        if (temp.day < 10) {
            temp.day = '0' + temp.day;
        }
        return String(temp.day) + ' ' + String(temp.mn) + ' ' + String(temp.yr + BASE_YR);
    }



    //sort in descending order
    function compare(a, b) {
        if (a.value > b.value)
            return -1;
        if (a.value < b.value)
            return 1;
        return 0;
    }



    function initFilter() {
        // buttons
        baseLayer.selectAll('.filters')
            .data(model.counts)
            .enter()
            .append('svg:text')
            .attr('class', 'filters')
            .attr('x', 0)
            .attr('y', function(d, i) {
                return box.h + i * (spacing.y - 9) + 620;
            })
            .attr('text-anchor', 'start')
            .text(function(d) {
                return d.index + ': ' + d.name + ' (' + d.value + ')';
            })
            .on('click', function(d) {
                d.isFilter = !d.isFilter;
                d3.select(this).classed('filterOn', d.isFilter);
                showZoom();
            })
            .on('mouseover', function() {
                d3.select(this).style('cursor', 'pointer');
            })
            .on('mouseoutr', function() {
                d3.select(this).style('cursor', 'default');
            });
    }



    function drawChart() {

        markerLayer.selectAll('.box')
            .data(model.captures)
            .enter()
            .append('a')
            .attr('xlink:href', function(d) {
                return srcPath + d.date + '/' + srcURL;
            })
            .attr('target', '_blank')
            .append('svg:rect')
            .attr('class', 'box')
            .attr('height', box.h)
            .attr('width', box.w)
            .style('stroke-opacity', 0.5)
            .style('stroke-width', 0.5)
            .style('fill', function(d) {
                return colours[d.change];
            })
            .style('fill-opacity', 0.4)
            .style('stroke', strokeColour)
            .attr('x', function(d) {
                //1996 10 17 23 59 08
                var time = dateToRange(d.date);
                var xPos = time.yr * 60 + time.mn * 5 + margin.left;
                return xPos;
            })
            .attr('y', function(d) {
                return lines[d.change] * spacing.y;

            })
            .attr('id', function(d) {
                return d.id;
            })
            .on('mouseover', function() {
                d3.select(this).style('cursor', 'pointer');
                d3.select(this).style('stroke-width', 2);
                d3.select(this).style('stroke', highlightColour);
            })
            .on('mouseout', function() {
                d3.select(this).style('cursor', 'default');
                d3.select(this).style('stroke-width', 1);
                d3.select(this).style('stroke', strokeColour);
            });

        //titles
        baseLayer.selectAll('.title')
            .data(model.titles)
            .enter()
            .append('svg:text')
            .attr('class', 'title')
            .style('fill', '#333')
            .attr('x', margin.left - 10)
            .attr('y', function(d) {
                return box.h + lines[d.name] * spacing.y;
            })
            .attr('text-anchor', 'end')
            .text(function(d) {
                return fullTitles[d.name] + ' (' + d.value + ')';
            });
        // MONTHLY VIEW titles
        baseLayer.selectAll('.monthly')
            .data(model.titles)
            .enter()
            .append('svg:text')
            .attr('class', 'monthly title')
            .style('fill', '#333')
            .attr('x', margin.left - 10)
            .attr('y', function(d) {
                return 292 + box.h + lines[d.name] * spacing.y;
            })
            .attr('text-anchor', 'end')
            .text(function(d) {
                return fullTitles[d.name];
            });

        baseLayer.append('svg:text')
            .attr('class', 'subheading')
            .style('fill', '#333')
            .attr('x', 0)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .text('Yearly View');
        baseLayer.append('svg:text')
            .attr('class', 'subheading')
            .style('fill', '#333')
            .attr('x', 0)
            .attr('y', 292)
            .attr('text-anchor', 'start')
            .text('Monthly View');
        baseLayer.append('svg:text')
            .attr('class', 'subheading toggle')
            .style('fill', '#333')
            .attr('x', 0)
            .attr('y', 610)
            .attr('text-anchor', 'start')
            .text('*Monthly View Filters (Click to toggle)');
        baseLayer.append('svg:text')
            .attr('class', 'instruction')
            .style('fill', '#333')
            .attr('x', 700)
            .attr('y', 410)
            .attr('text-anchor', 'start')
            .text('Click and drag the yearly view above to zoom');
        baseLayer.append('svg:text')
            .attr('class', 'instruction')
            .style('fill', '#333')
            .attr('x', 700)
            .attr('y', 430)
            .attr('text-anchor', 'start')
            .text('Click the filters below to toggle the markers');


        // horizontals
        baseLayer.selectAll('.horizontals')
            .data(model.titles)
            .enter()
            .append('svg:line')
            .attr('class', 'horizontals')
            .style('stroke', '#eee')
            .style('stroke-opacity', 1)
            .style('stroke-width', 1)
            .style('fill', 0)
            .attr('x1', margin.left - 5)
            .attr('x2', totalYears * 60 + margin.left)
            .attr('y1', function(d) {
                return box.h + lines[d.name] * spacing.y + (spacing.y - box.h) / 2;
            })
            .attr('y2', function(d) {
                return box.h + lines[d.name] * spacing.y + (spacing.y - box.h) / 2;
            });
        // verts
        baseLayer.selectAll('.verts')
            .data([1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016])
            .enter()
            .append('svg:line')
            .attr('class', 'verts')
            .style('stroke', '#eee')
            .style('stroke-opacity', 1)
            .style('stroke-width', 1)
            .style('fill', 0)
            .attr('y1', 0)
            .attr('y2', 8 * spacing.y)
            .attr('x1', function(d, i) {
                return i * 120 + margin.left;
            })
            .attr('x2', function(d, i) {
                return i * 120 + margin.left;
            });

        baseLayer.selectAll('.year')
            .data([1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016])
            .enter()
            .append('svg:text')
            .attr('class', 'year')
            .style('fill', '#333')
            .attr('x', function(d, i) {
                return i * 120 + margin.left + 4;
            })
            .attr('y', function(d) {
                return 20;
            })
            .text(function(d) {
                return d;
            });

        // Create brush for Yearly View on base layer
        brush = d3.brushX()
            .extent([
                [margin.left, 20],
                [(totalYears * 60) + margin.left, box.h * 13]
            ])
            .on('brush', brushed)
            .on('end', function() {
                showZoom();
            });

        baseLayer.append('g')
            .attr('class', 'x brush')
            .call(brush)
            .selectAll('rect')
            .attr('x', margin.left)
            .attr('y', margin.top + 4)
            .attr('height', 230)
            .attr('fill', '#ccc')
            .attr('fill-opacity', 0.5);
    }



    function brushed() {
        // chart range 1996 to 2018
        // 22 years
        var totalWidth = totalYears * 60;

        if (!d3.event.sourceEvent) return; // Only transition after input.
        if (!d3.event.selection) return; // Ignore empty selections.

        //get normalised position of brush extents to determine date range
        startBrushPosn = (d3.event.selection[0] - margin.left) / totalWidth;
        endBrushPosn = (d3.event.selection[1] - margin.left) / totalWidth;

        if (startBrushPosn < 0) startBrushPosn = 0;
        if (endBrushPosn < 0) endBrushPosn = 0;

        baseLayer.selectAll('.instruction').remove();
    }


    function showZoom() {
        var totalWidth = totalYears * 60;
        // chart range 1996 to 2018
        // 22 years

        var startDate = Math.round(startBrushPosn * totalYears * 12);
        var endDate = Math.round(endBrushPosn * totalYears * 12);
        var startYear = Math.floor(startDate / 12) + BASE_YR;
        var startMonth = startDate % 12 + 1;
        var displayMonth = startMonth;
        if (startMonth < 10) {
            displayMonth = '0' + startMonth;
        }

        var endYear = Math.floor(endDate / 12) + BASE_YR;
        // increment end month in order to pick up events that occur in the last month when we loop thru and compare time
        var endMonth = endDate % 12 + 1;
        if (endMonth < 10) {
            endMonth = '0' + endMonth;
        }

        var diff = endDate - startDate;
        var startPoint = startYear + '' + displayMonth + '00' + '000000';
        var endPoint = endYear + '' + endMonth + '00' + '000000';
        var numMonths = diff;
        var boxWidth = totalWidth / numMonths;

        var data = [];

        for (var i = 0; i < numMonths; i++) {
            data.push(i);
        }

        var zoomList = [];

        model.captures.forEach(function(d, i) {
            if (d.date >= startPoint && d.date < endPoint) {
                d.id = i;
                zoomList.push(d);
            }
        });

        zoomLayer.selectAll('.months').remove();
        zoomLayer.selectAll('.monthHeading').remove();
        zoomLayer.selectAll('.zoomMarks').remove();


        if (numMonths < 36) {

            zoomLayer.selectAll('.months')
                .data(data)
                .enter()
                .append('svg:rect')
                .attr('class', 'months')
                .attr('height', 280)
                .attr('width', boxWidth)
                .style('stroke', '#999')
                .style('stroke-opacity', 0.5)
                .style('stroke-width', 0.5)
                .style('fill', '#fff')
                .attr('y', 0)
                .attr('x', function(d, i) {
                    var xPos = i * boxWidth + margin.left;
                    return xPos;
                });
        }


        zoomLayer.selectAll('.monthHeading')
            .data(data)
            .enter()
            .append('svg:text')
            .attr('class', 'monthHeading')
            .style('fill', '#333')
            .attr('x', function(d, i) {
                var xPos = i * boxWidth + margin.left;
                return xPos;
            })
            .attr('y', function() {
                return -7;
            })
            .text(function(d) {
                var yr = startYear;
                var mon = (d + startMonth - 1) % 12 + 1;
                yr = startYear + Math.floor((d + startMonth - 1) / 12) + '';

                if (numMonths > 60) {
                    if (mon === 1) {
                        return months[mon] + ' ' + yr.substr(2, 2);
                    } else {
                        return '';
                    }
                }

                if (numMonths > 42) {
                    return abbrevMonths[mon];
                }
                if (numMonths > 24) {
                    return months[mon];
                }
                /*if (numMonths>24){
                    return abbrevMonths[mon] + ''  + yr.substr(2,2) ;
                }*/

                return months[mon] + ' ' + yr.substr(2, 2);
            });

        zoomLayer.selectAll('.zoomMarks')
            .data(zoomList)
            .enter()
            .append('a')
            .attr('xlink:href', function(d) {
                return srcPath + d.date + '/' + srcURL;
            })
            .attr('target', function() {
                return '_blank';
            })
            .append('svg:rect')
            .attr('class', 'zoomMarks')
            .attr('height', box.h)
            .attr('width', box.w)
            .style('stroke-opacity', 0.5)
            .style('stroke-width', 0.5)
            .style('fill', function(d) {
                return colours[d.change];
            })
            .style('fill-opacity', function(d) {
                var opacity = 0.7;
                var why = d.why.split(',');

                for (var itm in model.counts) {
                    if (model.counts[itm].isFilter) {
                        var containsWeb = why.indexOf(model.counts[itm].name);

                        if (containsWeb > -1) {
                            opacity = 0.1;
                        }
                    }
                }
                return opacity;
            })
            .style('stroke', strokeColour)
            .attr('x', function(d) {
                var time = dateToRange(d.date);
                var xPos = (time.yr - startYear + BASE_YR) * (12 * boxWidth) + (time.mn - startMonth) * boxWidth + (time.day - 1) * boxWidth / 31 + margin.left;
                return Math.round(xPos);
            })
            .attr('y', function(d) {
                return lines[d.change] * spacing.y;
            })
            .attr('id', function(d) {
                return d.id;
            })
            .on('mouseover', function(d, i) {
                d3.select(this).style('cursor', 'pointer');
                d3.select(this).style('stroke-width', 2);
                d3.select(this).style('stroke', highlightColour);

                var otherCount = 0;
                //split 'why' into number list
                var arr = d.why.split(',');
                var list = [];
                var response = ''; //'No reason why';

                for (i in arr) {
                    if (filterList[arr[i]]) {
                        list.push(filterList[arr[i]]);
                    } else {
                        otherCount++;
                    }
                }
                if (list.length !== 0) {
                    response = 'Why<span class="super">*</span>: ' + list;
                }

                if (otherCount > 1) {
                    response += ' +' + otherCount + ' more';
                }

                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);

                var img = '';
                var offsetY = -4; //4px vertical space
                if (d.why === 'screenshot') {
                    img = '<img class="thumb" src="thumb/' + d.date.substr(0, 8) + '.png"></img>';
                    offsetY = -79;
                }

                //get div#chart coords 0,85
                var el = document.getElementById('zoomLayer');
                var bounds = el.getBoundingClientRect();
                var chartX = parseInt(bounds.x);
                var chartY = parseInt(bounds.y);

                //get tooltip dims
                var tooltipHt = 120 / 2;
                var tooltipWd = 140 / 2;

                //from marker position
                var time = dateToRange(d.date);
                var xPos = (time.yr - startYear + BASE_YR) * (12 * boxWidth) + (time.mn - startMonth) * boxWidth + (time.day - 1) * boxWidth / 31;
                var yPos = lines[d.change] * spacing.y;
                //adjust for zoomlayer position
                xPos = Math.round(xPos) + chartX - tooltipWd + box.w / 2;
                yPos = yPos + chartY - tooltipHt + offsetY;

                tooltip.html(
                    '<div class="heading">' + fullTitles[d.change] +
                    '</div><div class="bolder">' + formatDate(d.date) +
                    img +
                    '</div><div class="filter">' + response + '</div>'
                )
                    .style('left', xPos + 'px')
                    .style('top', yPos + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).style('cursor', 'default');
                d3.select(this).style('stroke-width', 1);
                d3.select(this).style('stroke', strokeColour);
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

    }



    function gotData(json) {
        var crawls = [];
        var itm;
        model = json;
        model.titles = [];

        // loop through the ranks data and assign the values
        json.captures.forEach(function(d, i) {
            d.id = i;
        });

        //loop through changes for titles
        for (itm in json.change_counts) {
            model.titles.push({ name: itm, value: json.change_counts[itm] });
        }

        //loop through counts and sort in descending order (for filter)
        var idx = 0;
        for (itm in json.counts) {
            crawls.push({ index: 0, name: itm, value: json.counts[itm], isFilter: false });
        }
        crawls.sort(compare);

        var chr; // to set letter index for display
        for (var i in crawls) {
            chr = String.fromCharCode(97 + idx);
            crawls[i].index = chr;

            //store a reference
            var refname = crawls[i].name;
            filterList[refname] = chr;
            idx++;
        }
        json.counts = crawls;

        initFilter();

        drawChart();
    }



    function loadData() {
        d3.json(URL, function(error, json) {
            gotData(json);
        });
    }



    function init() {
        svg = d3.select('#chart').append('svg');

        svg.attr('width', width)
            .attr('height', height);

        baseLayer = svg.append('g').attr('class', 'baseLayer');
        markerLayer = svg.append('g').attr('class', 'markerLayer');
        zoomLayer = svg.append('g').attr('class', 'zoomLayer').attr('id', 'zoomLayer')
            .attr('transform', 'translate(' + 0 + ',' + 300 + ')');

        //set up tooltips
        tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }



    document.addEventListener('DOMContentLoaded', function() {
        init();
        loadData();
    });



    var exports = {
        init: init,
        loadData: loadData
    };


    return exports;


}());