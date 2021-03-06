/*
 *  ::718604!
 * 
 * Copyright(C) November 20, 2014 U.S. Food and Drug Administration
 * Authors: Dr. Vahan Simonyan (1), Dr. Raja Mazumder (2), et al
 * Affiliation: Food and Drug Administration (1), George Washington University (2)
 * 
 * All rights Reserved.
 * 
 * The MIT License (MIT)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

function vjSVG_HeatMap(source)
{

    vjSVG_Plot.call(this, source);
    if (!this.name) this.name = this.objID;
    var plot = this; // for use in closures

    if (!this.color) this.color = {min: "green", max: "red", mid: "yellow"};
    if (!this.color.min) this.color.min = "green";
    if (!this.color.max) this.color.max = "red";
    if (!this.color.mid) {
        var color0 = new vjColor(this.color.min);
        var color1 = new vjColor(this.color.max);
        this.color.mid = vjHCL((color0.hue() + color1.hue()) / 2, (color0.chroma() + color1.chroma()) / 2, (color0.lightness() + color1.lightness()) / 2).hex();
    }
    if (!this.color.missing) this.color.missing = "#eeeeee";

    if (!this.valueRange) this.valueRange = {min: 0, mid: 0.5, max: 1};
    this.valueRange.min = parseFloat(this.valueRange.min);
    this.valueRange.max = parseFloat(this.valueRange.max);
    if (this.valueRange.mid === undefined) {
        this.valueRange.mid = (this.valueRange.min + this.valueRange.max) / 2;
    } else {
        this.valueRange.mid = parseFloat(this.valueRange.mid);
    }

    if (!this.legend_range) this.legend_range = cpyObj(this.valueRange);
    if (this.legend_range.min === undefined) {
        this.legend_range.min = this.valueRange.min;
    } else {
        this.legend_range.min = parseFloat(this.legend_range.min);
    }
    if (this.legend_range.min_text === undefined) {
        this.legend_range.min_text = this.legend_range.min.toFixed(1);
    }

    if (this.legend_range.max === undefined) {
        this.legend_range.max = this.valueRange.max;
    } else {
        this.legend_range.max = parseFloat(this.legend_range.max);
    }
    if (this.legend_range.max_text === undefined) {
        this.legend_range.max_text = this.legend_range.max.toFixed(1);
    }
    
    if (this.legend_range.mid === undefined) {
        this.legend_range.mid = (this.legend_range.min + this.legend_range.max) / 2;
    } else {
        this.legend_range.mid = parseFloat(this.legend_range.mid);
    }
    if (this.legend_range.mid_text === undefined) {
        this.legend_range.mid_text = this.legend_range.mid.toFixed(1);
    }

    if (!this.legend_stop_size) this.legend_stop_size = 0; // if non-0: size of a legend stop in terms of legend_range units

    if (!this.minCellSize) this.minCellSize = 10;
    if (this.squareCells === undefined) this.squareCells = true;

    if (!this.geometry)
        this.geometry = {
            top_ratio: 0.5, // ratio of top tree height to heatmap height
            left_ratio: 0.5, // ratio of left tree width to heatmap width
            right_max: 200, // max width of right label in pixels
            right_ratio: 0.5, // ratio of right label width to heatmap width if < right_max
            bottom_max: 100, // max height of bottom label in pixels
            bottom_ratio: 0.5 // ratio of bottom label height to heatmap height if < bottom_max
        };

    this.heat = {
        initial: {
            crd: { x: 0.25, y: 0.25 },
            width: 0.5,
            height: 0.5
        }
    };

    // determine this experimentally based on leaf label font size
    if (!this.glyphHeight) this.glyphHeight = 0.03;

    // set if there is a png fallback for large heatmaps
    if (!this.heat_image_url) this.heat_image_url = null;
    // if number of cells >= heat_image_min_cells, prefer png over svg heatmap
    if (!this.heat_image_min_cells) this.heat_image_min_cells = 500 * 500;

    this.construct = function(axis, chartarea, scene)
    {
        this.findSeries();
        this.updateHeat(chartarea);

        if (this.heat_serie && this.heat_serie.has_nontrivial_data()) {
            this.constructHeat(chartarea);
        }
        if (this.left_tree_serie && this.left_tree_serie.has_nontrivial_data()) {
            this.constructLeftTree(chartarea, scene);
        }
        if (this.top_tree_serie && this.top_tree_serie.has_nontrivial_data()) {
            this.constructTopTree(chartarea, scene);
        }
    };

    this.findSeries = function() {
        this.left_tree_serie = null;
        this.top_tree_serie = null;
        this.heat_serie = null;
        for (var ic=0; ic<this.collection.length; ic++) {
            if (this.collection[ic].isTreeSeries) {
                if (this.left_tree_serie) {
                    if (!this.top_tree_serie) {
                        this.top_tree_serie = this.collection[ic];
                    }
                } else {
                    this.left_tree_serie = this.collection[ic];
                }
            } else if (this.collection[ic].isDataSeries && !this.heat_serie) {
                this.heat_serie = this.collection[ic];
            }
        }
    };

    this.updateHeat = function(chartarea)
    {
        this.heat.cellHeight = this.heat.cellWidth = 0;
        this.heat.rows = [];
        this.heat.cols = [];

        // chartarea may be in percent...
        if (chartarea && !(chartarea.width * 2 && chartarea.height * 2)) {
            chartarea = null;
        }

        if (!this.heat_serie || !this.heat_serie.has_nontrivial_data()) {
            return;
        }

        function makeCollapsedListWorker(list, node, vis, state, force_vis) {
            if (node.leafnode) {
                if (vis) {
                    list.push(state.cur);
                } else {
                    list[list.length-1].push(state.cur);
                }
                state.cur++;
            } else {
                if (force_vis && !node.expanded) {
                    node.expanded = true;
                } else if (vis && !node.expanded) {
                    vis = false;
                    list.push([]);
                }
                for (var i=0; i<node.children.length; i++) {
                    makeCollapsedListWorker(list, node.children[i], vis, state);
                }
            }
            return list;
        }

        function makeCollapsedList(serie, num, force_vis) {
            if (!serie || !serie.has_nontrivial_data) {
                var all = [];
                for (var i=0; i<num; i++)
                    all.push(i);
                return all;
            }
            return makeCollapsedListWorker([], serie.tree.root, true, {cur: 0}, force_vis);
        }

        var max_rows = this.heat_serie.tblArr.rows.length;
        var max_cols = this.heat_serie.tblArr.hdr.length ? this.heat_serie.tblArr.hdr.length - 1 : 0;

        this.use_heat_image = false;
        if (this.heat_image_url && this.heat_image_url != "static://" && (max_rows * max_cols >= this.heat_image_min_cells)) {
            this.use_heat_image = true;
        }

        this.heat.rows = makeCollapsedList(this.left_tree_serie, max_rows, this.use_heat_image);
        this.heat.cols = makeCollapsedList(this.top_tree_serie, max_cols, this.use_heat_image);

        var top_max_depth = this.top_tree_serie && this.top_tree_serie.maxDepth ? this.top_tree_serie.maxDepth : 1;
        var left_max_depth = this.left_tree_serie && this.left_tree_serie.maxDepth ? this.left_tree_serie.maxDepth : 1;

        if (this.left_tree_serie && this.left_tree_serie.has_nontrivial_data()) {
            // scale left ratio so left trees for short, wide heatmaps are not too wide
            var scaled_left_ratio = this.geometry.left_ratio * Math.max(0.01, left_max_depth / Math.max(top_max_depth, left_max_depth));
            var rat_sum = 1 + this.geometry.right_ratio + scaled_left_ratio;
            if (chartarea && chartarea.width * this.geometry.right_ratio / rat_sum > this.geometry.right_max) {
                this.heat.r = this.geometry.right_max / chartarea.width;
                this.heat.l = (1 - this.heat.r) * scaled_left_ratio / (1 + scaled_left_ratio);
            } else {
                this.heat.r = this.geometry.right_ratio / rat_sum;
                this.heat.l = scaled_left_ratio / rat_sum;
            }
        } else {
            this.heat.l = 0;
            if (chartarea && chartarea.width * this.geometry.right_ratio / (1 + this.geometry.right_ratio) > this.geometry.right_max) {
                this.heat.r = this.geometry.right_max / chartarea.width;
            } else {
                this.heat.r = this.geometry.right_ratio / (1 + this.geometry.right_ratio);
            }
        }

        if (this.top_tree_serie && this.top_tree_serie.has_nontrivial_data()) {
            // scale top ratio so top trees for tall, narrow heatmaps are not too tall
            var scaled_top_ratio = this.geometry.top_ratio * Math.max(0.01, top_max_depth / Math.max(top_max_depth, left_max_depth));
            var rat_sum = 1 + scaled_top_ratio + this.geometry.bottom_ratio;
            if (chartarea && chartarea.height * this.geometry.bottom_ratio / rat_sum > this.geometry.bottom_max) {
                this.heat.b = this.geometry.bottom_max / chartarea.height;
                this.heat.t = (1 - this.heat.b) * scaled_top_ratio / (1 + scaled_top_ratio);
            } else {
                this.heat.b = this.geometry.bottom_ratio / rat_sum;
                this.heat.t = scaled_top_ratio / rat_sum;
            }
        } else {
            this.heat.t = 0;
            if (chartarea && chartarea.height * this.geometry.bottom_ratio / (1 + this.geometry.bottom_ratio) > this.geometry.bottom_max) {
                this.heat.b = this.geometry.bottom_max / chartarea.height;
            } else {
                this.heat.b = this.geometry.bottom_ratio / (1 + this.geometry.bottom_ratio);
            }
        }

        if (chartarea && this.squareCells) {
            var chartWidthRatio = chartarea.width / chartarea.height;
            if (!chartWidthRatio || isNaN(chartWidthRatio))
                chartWidthRatio = 1;

            var dataWidthRatio = this.heat.cols.length / this.heat.rows.length;
            if (!dataWidthRatio || isNaN(dataWidthRatio))
                dataWidthRatio = 1;

            if (dataWidthRatio > chartWidthRatio || dataWidthRatio < chartWidthRatio) {
                var shifted_b = 1 - this.heat.t - (1 - this.heat.l - this.heat.r) * chartWidthRatio / dataWidthRatio;
                var shifted_r = 1 - this.heat.l - (1 - this.heat.t - this.heat.b) * dataWidthRatio / chartWidthRatio;

                var shifted_b_badness = Math.max(0, (1 - shifted_b) * chartarea.height - this.geometry.bottom_max) + Math.max(0, -shifted_b);
                var shifted_r_badness = Math.max(0, (1 - shifted_r) * chartarea.width - this.geometry.right_max) + Math.max(0, -shifted_r);

                if (shifted_b_badness < shifted_r_badness) {
                    this.heat.b = shifted_b;
                } else {
                    this.heat.r = shifted_r;
                }
            }
        }

        this.heat.width = 1 - this.heat.l - this.heat.r;
        this.heat.height = 1 - this.heat.t - this.heat.b;

        if (this.heat.cols.length)
            this.heat.cellWidth = this.heat.width / this.heat.cols.length;
        if (this.heat.rows.length)
            this.heat.cellHeight = this.heat.height / this.heat.rows.length;

//        if (chartarea) {
//            console.log("Cells: " + chartarea.width * this.heat.cellWidth + " px X " + chartarea.height * this.heat.cellHeight + " px");
//        }
    };

    this.constructLeftTree = function(chartarea, scene)
    {
        var left_tree_group = new vjSVG_group();
        this.left_tree_serie.type = "rectangular";
        var tree = new vjSVG_Phylogram({
            translation: {x: 0, y: this.heat.b + this.heat.cellHeight/2},
            scale: {x: this.heat.l, y: this.heat.height - this.heat.cellHeight},
            nodeLabel: false,
            leafSymbolType: false,
            stretchChildlessNodes: true,
            enableExpander: !this.use_heat_image
        });
        tree.add(this.left_tree_serie);
        tree.construct(null, chartarea, scene);
        left_tree_group.children.push(tree);
        this.children.push(left_tree_group);
    };

    this.constructTopTree = function(chartarea, scene)
    {
        var top_tree_group = new vjSVG_group();
        this.top_tree_serie.type = "rectangular";
        var tree = new vjSVG_Phylogram({
            matrix: [
                [0, this.heat.width - this.heat.cellWidth, 0, this.heat.l + this.heat.cellWidth / 2],
                [-this.heat.t, 0, 0, 1],
                [0, 0, 1, 0],
                [0, 0, 0, 1]
            ],
            nodeLabel: false,
            leafSymbolType: false,
            stretchChildlessNodes: true,
            enableExpander: !this.use_heat_image
        });
        tree.add(this.top_tree_serie);
        tree.construct(null, chartarea, scene);
        top_tree_group.children.push(tree);
        this.children.push(top_tree_group);
    };

    this.constructHeat = function(chartarea)
    {
        if (!this.heat.rows.length || !this.heat.cols.length)
            return;

        var color0 = new vjColor(this.color.min);
        var color1 = new vjColor(this.color.max);
        var colorM = new vjColor(this.color.mid);
        var colorX = new vjColor(this.color.missing);
        var h0 = color0.hue(); var h1 = color1.hue(); var hM0 = colorM.hue(); var hM1 = hM0;
        var c0 = color0.chroma(); var c1 = color1.chroma(); var cM = colorM.chroma();
        var l0 = color0.lightness(); var l1 = color1.lightness(); var lM = colorM.lightness();

        // special treatment for grayscale-to-color transition
        if (!c0)
            h0 = hM0;
        if (!c1)
            h1 = hM1;
        if (!cM) {
            hM0 = h0;
            hM1 = h1;
        }

        // setting a stroke width removes ugly white gaps between heatmap cells
        var heat_group = new vjSVG_group({
            pen: {"stroke-width": 1, "stroke-opacity": 1, "stroke-linecap": "square"}
        });
        var label_group = new vjSVG_group();

        function makeColor(value) {
            value = parseFloat(value);
            if (value < this.valueRange.mid) {
                var scale = Math.max(0, (value - this.valueRange.min) / (this.valueRange.mid - this.valueRange.min));
                return vjHCL(h0 + (hM0 - h0) * scale, c0 + (cM - c0) * scale, l0 + (lM - l0) * scale);
            } else {
                var scale = Math.min(1, (value - this.valueRange.mid) / (this.valueRange.max - this.valueRange.mid));
                return vjHCL(hM1 + (h1 - hM1) * scale, cM + (c1 - cM) * scale, lM + (l1 - lM) * scale);
            }
        }

        if (this.use_heat_image) {
            heat_group.children.push(new vjSVG_image({
                crd: {x: this.heat.l, y: this.heat.b},
                width: this.heat.width,
                height: this.heat.height,
                url: this.heat_image_url,
                preserveAspectRatio: "none"
            }));
        } else {
            for (var ir=0; ir<this.heat.rows.length; ir++) {
                for (var ic=0; ic<this.heat.cols.length; ic++) {
                    var serie_row = this.heat.rows[this.heat.rows.length-1-ir];
                    var serie_col = this.heat.cols[ic];

                    if ((serie_row instanceof Array) || (serie_col instanceof Array)) {
                        serie_row = (serie_row === 0) ? [0] : verarr(serie_row);
                        serie_col = (serie_col === 0) ? [0] : verarr(serie_col);
                        var value_min = null;
                        var value_max = null;
                        var value_list = [];
                        for (var jr=0; jr<serie_row.length; jr++) {
                            for (var jc=0; jc<serie_col.length; jc++) {
                                var value = this.heat_serie.tblArr.rows[serie_row[jr]].cols[1 + serie_col[jc]];
                                value_list.push(value);
                                var value = parseFloat(value);
                                if (!isNaN(value)) {
                                    value_min = (value_min == null) ? value : Math.min(value, value_min);
                                    value_max = (value_max == null) ? value : Math.max(value, value_max);
                                }
                            }
                        }
                        var color_min = (value_min == null) ? colorX : makeColor.call(this, value_min);
                        var color_max = (value_max == null) ? colorX : makeColor.call(this, value_max);

                        var cellHandler = function(irows, icols, values) { return function() { return plot.callOnclickCallbacks(irows, icols, "map", values); } } (serie_row, serie_col, value_list);

                        heat_group.children.push(new vjSVG_trajectory({
                            coordinates: [
                                {x: this.heat.l + ic * this.heat.cellWidth, y: this.heat.b + ir * this.heat.cellHeight},
                                {x: this.heat.l + (ic + 1) * this.heat.cellWidth, y: this.heat.b + ir * this.heat.cellHeight},
                                {x: this.heat.l + (ic + 1) * this.heat.cellWidth, y: this.heat.b + (ir + 1) * this.heat.cellHeight}
                            ],
                            closed: true,
                            brush: { "fill-opacity": 1, fill: color_min.hex(), stroke: color_min.hex() },
                            handler: { onclick: cellHandler }
                        }));
                        heat_group.children.push(new vjSVG_trajectory({
                            coordinates: [
                                {x: this.heat.l + ic * this.heat.cellWidth, y: this.heat.b + ir * this.heat.cellHeight},
                                {x: this.heat.l + (ic + 1) * this.heat.cellWidth, y: this.heat.b + (ir + 1) * this.heat.cellHeight},
                                {x: this.heat.l + ic * this.heat.cellWidth, y: this.heat.b + (ir + 1) * this.heat.cellHeight}
                            ],
                            closed: true,
                            brush: { "fill-opacity": 1, fill: color_max.hex(), stroke: color_max.hex() },
                            handler: { onclick: cellHandler }
                        }));
                    } else {
                        // non-collapsed case
                        var value = this.heat_serie.tblArr.rows[serie_row].cols[1 + serie_col];

                        var color = colorX;
                        if (!isNaN(parseFloat(value))) {
                            color = makeColor.call(this, value);
                        }

                        var cellHandler = function(irows, icols, values) { return function() { return plot.callOnclickCallbacks(irows, icols, "map", values); } } (serie_row, serie_col, value);

                        heat_group.children.push(new vjSVG_box({
                            crd: {x: this.heat.l + ic * this.heat.cellWidth, y: this.heat.b + ir * this.heat.cellHeight},
                            width: this.heat.cellWidth,
                            height: this.heat.cellHeight,
                            brush: { "fill-opacity": 1, fill: color.hex(), stroke: color.hex() },
                            handler: { onclick: cellHandler }
                        }));
                    }
                }
            }
        }

        for (var ir=0; ir<this.heat.rows.length; ir++) {
            var serie_row = this.heat.rows[this.heat.rows.length-1-ir];
            var labelText = "";
            if (serie_row instanceof Array) {
                for (var jr=0; jr<serie_row.length; jr++) {
                    if (jr) {
                        labelText += "; "
                    }
                    labelText += this.heat_serie.tblArr.rows[serie_row[jr]].cols[0];
                }
            } else {
                labelText = this.heat_serie.tblArr.rows[serie_row].cols[0];
            }
            var handler = function(irows, labelText) { return function() { return plot.callOnclickCallbacks(irows, null, "right", labelText); } } (serie_row, labelText);
            label_group.children.push(new vjSVG_text({
                crd: {x: this.heat.l + this.heat.width, y: this.heat.b + (ir + 0.5) * this.heat.cellHeight},
                font: {"font-size": 9, "font-weight": "bold"},
                text: labelText,
                ellipsizeWidth: 1 - this.heat.l - this.heat.width,
                title: labelText,
                dx: ".3em",
                dy: ".3em",
                handler: {onclick: handler }
            }));
        }

        for (var ic=0; ic<this.heat.cols.length; ic++) {
            var serie_col = this.heat.cols[ic];
            var labelText = "";
            if (serie_col instanceof Array) {
                for (var jc=0; jc<serie_col.length; jc++) {
                    if (jc) {
                        labelText += "; "
                    }
                    labelText += this.heat_serie.tblArr.hdr[1 + serie_col[jc]].name;
                }
            } else {
                labelText = this.heat_serie.tblArr.hdr[1 + serie_col].name;
            }
            var handler = function(icols, labelText) { return function() { return plot.callOnclickCallbacks(null, icols, "right", labelText); } } (serie_col, labelText);
            label_group.children.push(new vjSVG_text({
                crd: {x: this.heat.l + (ic + 0.5) * this.heat.cellWidth, y: this.heat.b},
                font: {"font-size": 9, "font-weight": "bold"},
                text: labelText,
                ellipsizeWidth: 1 - this.heat.l - this.heat.width,
                title: labelText,
                angle: 315,
                dx: ".3em",
                dy: ".3em",
                handler: {onclick: handler}
            }));
        }

        this.children.push(heat_group);
        this.children.push(label_group);

        // legend
        // setting a stroke width removes ugly white gaps between legend stops
        var legend_group = new vjSVG_group({pen: {"stroke-width": 1, "stroke-opacity": 1, "stroke-linecap": "square"}});
        var legend_range_width = this.legend_range.max - this.legend_range.min;
        var legend_range_width_to_mid = this.legend_range.mid - this.legend_range.min;

        var legend_stop_size = this.legend_stop_size ? this.legend_stop_size : legend_range_width / 14;
        var legend_stops_to_mid = Math.floor(legend_range_width_to_mid / legend_stop_size);
        var legend_stops = 1 + legend_stops_to_mid + Math.floor((legend_range_width - legend_range_width_to_mid) / legend_stop_size);

        var legend_height = this.heat.b / 3;
        var legend_width = legend_height / 8;
        if (chartarea && chartarea.width * 2) {
            legend_width = this.minCellSize / (2 * chartarea.width);
        }
        var legend_crd = {x: (this.heat.l + legend_width)/3, y: (this.heat.b - legend_height)/3};
        //var legend_debug = [];
        for (var i=0; i<legend_stops; i++) {
            var value;
            if (i < legend_stops_to_mid) {
                var scale = i / legend_stops_to_mid;
                value = this.valueRange.min + scale * (this.valueRange.mid - this.valueRange.min);
            } else if (i == legend_stops_to_mid) {
                value = this.valueRange.mid;
            } else {
                var scale = (i + 1 - legend_stops_to_mid) / (legend_stops - legend_stops_to_mid);
                value = this.valueRange.mid + scale * (this.valueRange.max - this.valueRange.mid);
            }
            var color = makeColor.call(this, value).hex();
            //legend_debug.push({"stop #": i, type: i < legend_stops_to_mid ? "lower" : i > legend_stops_to_mid ? "upper" : "mid", value: value, color: color});
            legend_group.children.push(new vjSVG_box({
                crd: {x: legend_crd.x, y: legend_crd.y + i * (legend_height/legend_stops)},
                width: legend_width,
                height: legend_height/legend_stops,
                brush: {"fill-opacity": 1, fill: color, stroke: color}
            }));
        }
        //console.table(legend_debug);
        legend_group.children.push(new vjSVG_text({
            crd: {x: legend_crd.x + legend_width, y: legend_crd.y},
            font: {"font-size": 9},
            text: this.legend_range.min_text,
            dx: ".3em",
            dy: ".3em"
        }));
        legend_group.children.push(new vjSVG_text({
            crd: {x: legend_crd.x + legend_width, y: legend_crd.y + legend_height * (legend_stops_to_mid + 0.5) / legend_stops},
            font: {"font-size": 9},
            text: this.legend_range.mid_text,
            dx: ".3em",
            dy: ".3em"
        }));
        legend_group.children.push(new vjSVG_text({
            crd: {x: legend_crd.x + legend_width, y: legend_crd.y + legend_height},
            font: {"font-size": 9},
            text: this.legend_range.max_text,
            dx: ".3em",
            dy: ".3em"
        }));
        this.children.push(legend_group);
    };

    this.onclickCallbacks = [];
    this.registerOnclickCallback = function(callback, callbackParam, callbackThis, options)
    {
        if (!options)
            options = { right: true, bottom: true, map: true };

        this.onclickCallbacks.push({callback: callback, param: callbackParam, "this": callbackThis, options: options});
    };

    this.callOnclickCallbacks = function(irows, icols, type, value)
    {
        if (!this.onclickCallbacks)
            return;

        for (var i=0; i<this.onclickCallbacks.length; i++) {
            var cb = this.onclickCallbacks[i];
            if (!cb.options[type])
                continue;

            cb.callback.call(cb["this"] ? cb["this"] : this, irows, icols, type, value, cb.param);
        }
    };

    this.preferredScale = function(proposed) {
        this.findSeries();
        this.updateHeat();

        if (!this.heat || !this.heat.rows || !this.heat.cols || !this.heat.rows.length || !this.heat.cols.length)
            return proposed;

        return {x: this.heat.cols.length * this.minCellSize / this.heat.width, y: this.heat.rows.length * this.minCellSize / this.heat.height, z: proposed.z};
    };

}
