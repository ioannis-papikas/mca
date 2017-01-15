/*
 * Map Processor
 *
 * This file is responsible for loading a map into the memory,
 * pre-processing the map for the manhattan-cohesive areas and
 * search for a path between any two points.
 *
 */

MapProcessor = {
    busy: false,
    final_areas: null,
    final_nodes: null,
    search_nodes: null,
    processed: false,
    startPoint: null,
    endPoint: null,
    initialize: function () {
        this.busy = false;
        this.final_areas = [];
        this.final_nodes = [];
        this.search_nodes = [];
        this.processed = false;
        return this;
    },
    preProcess: function (callback) {
        // Check busy status
        if (this.busy)
            return false;

        // Check map
        if (!Map.map)
            return false;

        // Set busy status
        this.busy = true;

        // Preprocess map

        // Initialize variables
        var width = Map.width;
        var height = Map.height;
        var map_nodes = [];

        // Here we preprocess the map.
        // We form Manhattan-cohesion areas, where any two points inside
        // an area can be connected with a straight line.
        // We define straight line as the path where we can move from one point to other and
        // at each step, we decrease the Manhattan-distance.

        // This is the front of the search, the open areas to be expanded
        var front = [];

        // Log activity
        mapLogViewer.log("Map pre-process initiated.");

        // Counter for areas to be created
        var area_counter = 0;
        // Counter for nodes to be created
        var node_counter = 0;
        for (var y = 0; y < height; y++) {
            // For each row, get row slices of free areas
            var current_slices = [];
            var slice_flag = false;
            // Initialize first slice
            var current = Object.create(MapSlice);
            for (var x = 0; x < width; x++) {
                // Parse each line and search for free areas

                // If we are in a slice and next is wall or the above pattern has changed, break slice
                if ((!Map.getPoint(x, y)
                    || (y > 0 && Map.getPoint(x, y - 1) != Map.getPoint(current.first, y - 1)))
                    && slice_flag) {
                    var idd = current_slices.length;
                    current.ids = [];
                    current.ids.push(idd);
                    current_slices.push(current);
                    slice_flag = false;
                }

                // In case it is a valid point
                if (Map.getPoint(x, y)) {
                    // Check if it's already inside a slice
                    // Create new slice if needed
                    if (!slice_flag) {
                        // If it's the first point of the slice,
                        // create a new slice and set first point
                        current = Object.create(MapSlice).initialize(y);
                        current.setfirst(x);
                        slice_flag = true;
                    }
                    // Set last point as the current point
                    current.setLast(x);
                }
            }

            // If there is a last slice with no wall in the end
            // Insert it to the list
            if (slice_flag) {
                var idd = current_slices.length;
                current.ids = [];
                current.ids.push(idd);
                current_slices.push(current);
            }

            // Create inserted index for slices
            var inserted = [];
            // Check for every area in the front, which slice can be inserted into an area
            for (var f = 0; f < front.length; f++) {
                front[f].to_close = true;
                // Initialize all candidate slices to be inserted (connected slices somehow)
                var connected = [];
                for (var j = 0; j < current_slices.length; j++) {
                    // If slice is out of range, break loop
                    if (current_slices[j].first > front[f].last_right + 1)
                        break;

                    // A Connected slice may be in 6 positions:
                    // - Exactly below and on the left (possibly connected) (take this slice only if area can go left)
                    var below_left = (current_slices[j].last == front[f].last_left - 1 && front[f].can_go_left());
                    // - Exactly below and left of the front (connected but not sure if area can go that way)
                    var left_and_below = (current_slices[j].first < front[f].last_left && front[f].can_go_left() && current_slices[j].last > front[f].last_left && current_slices[j].last <= front[f].last_right);
                    // - Exactly below (all areas can go downwards)
                    var below = (current_slices[j].first >= front[f].last_left && current_slices[j].last <= front[f].last_right);
                    // - Exactly below and on the right (possibly connected) (take this slice only if area can go right)
                    var below_right = (current_slices[j].first == front[f].last_right + 1 && front[f].can_go_right());
                    // - Exactly below and right of the front (connected but not sure if area can go that way)
                    var right_and_below = (current_slices[j].first >= front[f].last_left && current_slices[j].first < front[f].last_right && current_slices[j].last > front[f].last_right && front[f].can_go_right());
                    // - Exactly below and on the left and on the right of the front (connected but the front must be able to expand on both directions)
                    var right_and_below_and_left = (current_slices[j].first < front[f].last_left && front[f].can_go_left() && current_slices[j].last > front[f].last_right && front[f].can_go_right());

                    // If slice in one position of the above and not inserted yet, is connected
                    if ((below_left || left_and_below || below || below_right || right_and_below || right_and_below_and_left) && !current_slices[j].inserted)
                        connected.push(current_slices[j]);
                }

                // If no connected slices found
                // Proceed to the next front
                if (connected.length == 0)
                    continue;

                // After getting the possibly connected slices
                // - Check if two slices can be merged
                // - Decide which slice can be inserted into the front
                //   - Take the slice with the biggest width
                //	 - Insert it only if width > 10% of last width of area

                // In Details:
                // - Check if two slices can be merged
                var connected_merged = [];
                var merged = Object.create(MapSlice);
                merged = connected[0];
                for (var i = 0; i < connected.length - 1; i++) {
                    // If next slice is right next to current, merge
                    if ((connected[i + 1].first - connected[i].last) == 1)
                        merged.merge_slice(connected[i + 1]);
                    else {
                        // Else, insert merged slice to connected_merged
                        // and set next slice as the new slice to be merged
                        connected_merged.push(merged);

                        // Get next connected slice as base
                        merged = Object.create(MapSlice);
                        merged = connected[i + 1];
                    }
                }
                // Insert merged slice
                connected_merged.push(merged);
                // - Decide which slice can be inserted into the front (actually connected slices)
                var actually_connected = [];
                for (var i = 0; i < connected_merged.length; i++)
                    if ((connected_merged[i].last >= front[f].last_left && connected_merged[i].last <= front[f].last_right)
                        || (connected_merged[i].first >= front[f].last_left && connected_merged[i].first <= front[f].last_right)
                        || (connected_merged[i].first <= front[f].last_left && connected_merged[i].last >= front[f].last_right)) {
                        connected_merged[i].area_connected = front[f].id;
                        actually_connected.push(connected_merged[i]);
                    }

                // Reset area of connected and merged slices
                connected_merged = [];
                //   - Take the slice with the biggest width
                if (actually_connected.length == 0)
                    continue;
                var max_width = actually_connected[0].size;
                var indx = 0;
                for (var i = 1; i < actually_connected.length; i++)
                    if (actually_connected[i].size > max_width) {
                        max_width = actually_connected[i].size;
                        indx = i;
                    }
                // - Insert it only if width > 10% of last width of area (It prevents from expanding areas with no reason)
                var perc = (max_width / front[f].last_width);
                if (perc > 0.1) {
                    // Set wall guide of the front on both sides
                    if (front[f].last_left < actually_connected[indx].first)
                        front[f].close_left = true;
                    else if (front[f].last_left > actually_connected[indx].first)
                        front[f].open_left = true;

                    if (front[f].last_right < actually_connected[indx].last)
                        front[f].open_right = true;
                    else if (front[f].last_right > actually_connected[indx].last)
                        front[f].close_right = true;

                    // Creating nodes before inserting slice to area
                    if (f > 0 && ((front[f - 1].to_close && front[f - 1].last_right >= actually_connected[indx].first)
                        || (!front[f - 1].to_close && front[f - 1].blast_right >= actually_connected[indx].first))) {
                        // If it's after the first front, check for connectivity with the previous front in order to create nodes
                        var top_start = (front[f - 1].last_left < front[f - 1].blast_left && front[f - 1].blast_left > -1 ? front[f - 1].blast_left : front[f - 1].last_left);
                        top_start = (actually_connected[indx].first < top_start ? top_start : actually_connected[indx].first);
                        var top_end = (front[f - 1].last_right > front[f - 1].blast_right && front[f - 1].blast_right > -1 ? front[f - 1].blast_right : front[f - 1].last_right);
                        top_end = (actually_connected[indx].last < top_end ? actually_connected[indx].last : top_end);

                        var bottom_start = top_start;
                        var bottom_end = top_end;

                        // First node on the left
                        if (top_end >= top_start) {
                            var p1_x = top_start;
                            var p1_y = actually_connected[indx].row - 2;
                            if (!Map.getPoint(p1_x, p1_y))
                                p1_y = actually_connected[indx].row - 1;
                            var n_left = this.getFullNode(node_counter, front[f - 1].id, p1_x, p1_y, front[f].id, bottom_start, actually_connected[indx].row);
                            // Add to node list
                            map_nodes.push(n_left);
                            node_counter++;

                            // Last node on the right
                            if (top_end > top_start) {
                                var p1_x = top_end;
                                var p1_y = actually_connected[indx].row - 2;
                                if (!Map.getPoint(p1_x, p1_y))
                                    p1_y = actually_connected[indx].row - 1;
                                var n_right = this.getFullNode(node_counter, front[f - 1].id, p1_x, p1_y, front[f].id, bottom_end, actually_connected[indx].row);
                                // Add to node list
                                map_nodes.push(n_right);
                                node_counter++;

                                // Node in the middle of the space between top_start-top_end or bottom_start-bottom_end (choose the smallest distance)
                                if (top_end - top_start > 10) {
                                    var middle = (top_start - top_end < top_start - top_end) ? top_start + (top_end - top_start + 1) / 2 : bottom_start + (bottom_end - bottom_start + 1) / 2;
                                    var p1_x = middle;
                                    var p1_y = actually_connected[indx].row - 2;
                                    if (!Map.getPoint(p1_x, p1_y))
                                        p1_y = actually_connected[indx].row - 1;
                                    var n_middle = this.getFullNode(node_counter, front[f - 1].id, p1_x, p1_y, front[f].id, middle, actually_connected[indx].row);
                                    // Add node to list
                                    map_nodes.push(n_middle);
                                    node_counter++;
                                }
                            }
                        }
                    }
                    // Initialize front
                    var f1 = 1;
                    // If there are still fronts to calculate, check if slice is connected with any of the next fronts in order to create nodes
                    if (f < front.length - 1)
                        while ((f + f1 < front.length) && front[f + f1].last_left <= actually_connected[indx].last) {
                            var top_start = (front[f + f1].last_left < front[f + f1].blast_left && front[f + f1].blast_left > 0 ? front[f + f1].blast_left : front[f + f1].last_left);
                            top_start = (actually_connected[indx].first < top_start ? top_start : actually_connected[indx].first);
                            var top_end = (front[f + f1].last_right > front[f + f1].blast_right && front[f + f1].blast_right > 0 ? front[f + f1].blast_right : front[f + f1].last_right);
                            top_end = (actually_connected[indx].last < top_end ? actually_connected[indx].last : top_end);

                            var bottom_start = (front[f + f1].last_left < front[f + f1].blast_left && front[f + f1].blast_left > 0 ? front[f + f1].blast_left : front[f + f1].last_left);
                            bottom_start = top_start;
                            var bottom_end = (front[f + f1].last_right > front[f + f1].blast_right && front[f + f1].blast_right > 0 ? front[f + f1].blast_right : front[f + f1].last_right);
                            bottom_end = top_end;

                            // First node on the left
                            if (top_end >= top_start) {
                                var p1_x = top_start;
                                var p1_y = actually_connected[indx].row - 2;
                                if (!Map.getPoint(p1_x, p1_y))
                                    p1_y = actually_connected[indx].row - 1;
                                var n_left = this.getFullNode(node_counter, front[f + f1].id, p1_x, p1_y, front[f].id, bottom_start, actually_connected[indx].row);
                                // Add node to list
                                map_nodes.push(n_left);
                                node_counter++;

                                if (top_end > top_start) {
                                    var p1_x = top_end;
                                    var p1_y = actually_connected[indx].row - 2;
                                    if (!Map.getPoint(p1_x, p1_y))
                                        p1_y = actually_connected[indx].row - 1;
                                    var n_right = this.getFullNode(node_counter, front[f + f1].id, p1_x, p1_y, front[f].id, bottom_end, actually_connected[indx].row);
                                    // Add node to list
                                    map_nodes.push(n_right);
                                    node_counter++;

                                    // Node in the middle of the space between top_start-top_end or bottom_start-bottom_end (choose the smallest distance)
                                    if (top_end - top_start > 10) {
                                        var middle = (top_start - top_end < top_start - top_end) ? top_start + (top_end - top_start + 1) / 2 : bottom_start + (bottom_end - bottom_start + 1) / 2;
                                        var n_middle = this.getFullNode(node_counter, front[f + f1].id, middle, actually_connected[indx].row - 1, front[f].id, middle, actually_connected[indx].row);
                                        // Add node to list
                                        map_nodes.push(n_middle);
                                        node_counter++;
                                    }
                                }
                            }
                            f1++;
                        }
                    // Inserting slice to area
                    front[f].addPoints(actually_connected[indx].row, actually_connected[indx].first, actually_connected[indx].last);
                    front[f].to_close = false;

                    // Store ids of inserted slices
                    for (var i = 0; i < actually_connected[indx].ids.length; i++) {
                        inserted.push(actually_connected[indx].ids[i]);
                        current_slices[actually_connected[indx].ids[i]].area_inserted = front[f].id;
                        current_slices[actually_connected[indx].ids[i]].current_front = f;
                    }
                }
                // Set boolean for the slices that already inserted
                for (var j = 0; j < inserted.length; j++)
                    current_slices[inserted[j]].inserted = true;
            }

            // For the slices which weren't inserted anywhere, create new areas
            // And insert them into the front
            for (i = 0; i < current_slices.length; i++) {
                if (!current_slices[i].inserted) {
                    // If slice didn't inserted anywhere, check for nodes and create them
                    for (k = 0; k < front.length; k++) {
                        if (!(current_slices[i].last < front[k].last_left && current_slices[i].last < front[k].blast_left)
                            && !(current_slices[i].first > front[k].last_right && current_slices[i].first > front[k].blast_right)) {
                            // Get some values
                            var l_left = (front[k].to_close ? front[k].last_left : front[k].blast_left);
                            var l_right = (front[k].to_close ? front[k].last_right : front[k].blast_right);
                            var start = ((current_slices[i].first < l_left) ? l_left : current_slices[i].first);
                            var end = ((current_slices[i].last > l_right) ? l_right : current_slices[i].last);

                            // First node on the left
                            if (end < start)
                                continue;

                            // Create new node
                            // First node on the left
                            var n_left = this.getFullNode(node_counter, front[k].id, start, current_slices[i].row - 1, area_counter, start, current_slices[i].row);
                            // Add to node list
                            map_nodes.push(n_left);
                            node_counter++;

                            // Check whether the slice is one point only
                            if (end == start)
                                continue;

                            // First node on the right
                            var n_right = this.getFullNode(node_counter, front[k].id, end, current_slices[i].row - 1, area_counter, end, current_slices[i].row);
                            // Add to node list
                            map_nodes.push(n_right);
                            node_counter++;

                            // We add an extra node in the middle of the slice (if slice length > 10)
                            if (end - start < 10)
                                continue;

                            // We create a node in the middle of the space so when in search to choose
                            // between top_start-top_end or bottom_start-bottom_end (choose the smallest distance)
                            var middle = start + (end - start + 1) / 2;
                            var n_middle = this.getFullNode(node_counter, front[k].id, middle, current_slices[i].row - 1, area_counter, middle, current_slices[i].row);
                            // Add to node list
                            map_nodes.push(n_middle);
                            node_counter++;
                        }
                    }

                    // Create a new area and insert it into the front
                    var temp = Object.create(MapArea).initialize(area_counter);
                    temp.addPoints(current_slices[i].row, current_slices[i].first, current_slices[i].last);
                    front.push(temp);
                    current_slices[i].area_inserted = area_counter;
                    area_counter++;
                }

                // If two slices are connected and inserted to different areas, create node
                if (i > 0 && current_slices[i - 1].area_inserted != current_slices[i].area_inserted
                    && current_slices[i - 1].last == current_slices[i].first - 1
                    && current_slices[i].row > 0) {

                    // Create new node between the slices
                    var node = this.getFullNode(node_counter, current_slices[i - 1].area_inserted, current_slices[i - 1].last, current_slices[i].row, current_slices[i].area_inserted, current_slices[i].first, current_slices[i].row);

                    // Add to map node list
                    map_nodes.push(node);
                    node_counter++;
                }
            }

            // After expanding fronts or creating new
            // Remove the fronts that didn't append to any area and insert them to the final areas
            var temp = [];
            var f_to_close = 0;
            var f_not_to_close = 0;
            for (var i = 0; i < front.length; i++) {
                if (!front[i].to_close) {
                    temp.push(front[i]);
                    f_not_to_close++;
                } else {
                    this.final_areas.push(front[i]);
                    f_to_close++;
                }
            }
            front = temp;

            // Reset all areas of the front to close on next loop
            for (var i = 0; i < front.length; i++)
                front[i].to_close = true;

            // Sort fronts by last_left
            function sort_area_by_left(a, b) {
                return a.last_left - b.last_left;
            }

            front.sort(sort_area_by_left);
        }

        // Insert the last fronts
        for (var i = 0; i < front.length; i++)
            this.final_areas.push(front[i]);

        // Sort final areas with id
        function sort_area_by_id(a, b) {
            return a.id - b.id;
        }

        this.final_areas.sort(sort_area_by_id);
        mapLogViewer.log("Total areas created: " + this.final_areas.length);
        mapLogViewer.log("Total nodes created: " + map_nodes.length);

        // Creating real nodes and successors (Creating graph)
        mapLogViewer.log("Creating the map graph...\n");

        // Sort nodes
        function sort_nodes_by_id(a, b) {
            return a.id - b.id;
        }

        map_nodes.sort(sort_nodes_by_id);
        // Asserting nodes to areas
        for (var i = 0; i < map_nodes.length; i++) {
            var area_id1 = map_nodes[i].areas[0];
            var area_id2 = map_nodes[i].areas[1];
            var node_id = map_nodes[i].id;
            this.final_areas[area_id1].nodes.push(node_id);
            this.final_areas[area_id2].nodes.push(node_id);
        }

        // Creating children and completing graph
        this.final_nodes = [];
        for (i = 0; i < map_nodes.length; i++) {
            /*
             * For every node, search the nodes of the connected areas.
             * For every other node, create line
             *
             */
            var final_node = Object.create(MapNode);
            final_node = map_nodes[i];
            var area1 = Object.create(MapArea);
            area1 = this.final_areas[final_node.areas[0]];
            var area2 = Object.create(MapArea);
            area2 = this.final_areas[final_node.areas[1]];

            // Setting children from first area
            var node_count1 = area1.nodes.length;
            for (var j = 0; j < node_count1; j++) {
                var temp_node = Object.create(MapNode);
                temp_node = map_nodes[area1.nodes[j]];
                if ((final_node.areas[0] == temp_node.areas[0] && final_node.areas[1] != temp_node.areas[1])
                    || (final_node.areas[0] == temp_node.areas[1] && final_node.areas[1] != temp_node.areas[0])
                    || (final_node.areas[1] == temp_node.areas[0] && final_node.areas[0] != temp_node.areas[1])
                    || (final_node.areas[1] == temp_node.areas[1] && final_node.areas[0] != temp_node.areas[0])) {

                    var area_id;
                    var start = Object.create(xyLoc);
                    var end = Object.create(xyLoc);
                    if (final_node.areas[0] == temp_node.areas[0] || final_node.areas[0] == temp_node.areas[1]) {
                        area_id = final_node.areas[0];
                        start.setPosition(final_node.items[0].position.x, final_node.items[0].position.y);
                        if (final_node.areas[0] == temp_node.areas[0])
                            end.setPosition(temp_node.items[0].position.x, temp_node.items[0].position.y);
                        else
                            end.setPosition(temp_node.items[1].position.x, temp_node.items[1].position.y);
                    }
                    else {
                        area_id = final_node.areas[1];
                        start.setPosition(final_node.items[1].position.x, final_node.items[1].position.y);
                        end = (final_node.areas[1] == temp_node.areas[0] ? temp_node.items[0].position : temp_node.items[1].position);
                    }
                    var mhPath = Object.create(MapPath).create(start, end, this.final_areas[area_id]);
                    var real_distance = mhPath.distance;
                    temp_node.distance = real_distance;
                    final_node.children.push(temp_node);
                }
            }

            // Setting children from second area
            var node_count2 = area2.nodes.length;
            for (var j = 0; j < node_count2; j++) {
                var temp_node = Object.create(MapNode);
                temp_node = map_nodes[area2.nodes[j]];
                if ((final_node.areas[0] == temp_node.areas[0] && final_node.areas[1] != temp_node.areas[1])
                    || (final_node.areas[0] == temp_node.areas[1] && final_node.areas[1] != temp_node.areas[0])
                    || (final_node.areas[1] == temp_node.areas[0] && final_node.areas[0] != temp_node.areas[1])
                    || (final_node.areas[1] == temp_node.areas[1] && final_node.areas[0] != temp_node.areas[0])) {

                    var area_id;
                    var start = Object.create(xyLoc);
                    var end = Object.create(xyLoc);
                    if (final_node.areas[0] == temp_node.areas[0] || final_node.areas[0] == temp_node.areas[1]) {
                        area_id = final_node.areas[0];
                        start.setPosition(final_node.items[0].position.x, final_node.items[0].position.y);
                        if (final_node.areas[0] == temp_node.areas[0])
                            end.setPosition(temp_node.items[0].position.x, temp_node.items[0].position.y);
                        else
                            end.setPosition(temp_node.items[1].position.x, temp_node.items[1].position.y);
                    }
                    else {
                        area_id = final_node.areas[1];
                        start.setPosition(final_node.items[1].position.x, final_node.items[1].position.y);
                        end = (final_node.areas[1] == temp_node.areas[0] ? temp_node.items[0].position : temp_node.items[1].position);
                    }
                    var mhPath = Object.create(MapPath).create(start, end, this.final_areas[area_id]);
                    var real_distance = mhPath.distance;
                    temp_node.distance = real_distance;
                    final_node.children.push(temp_node);
                }
            }
            if (final_node.children.length > 0)
                this.final_nodes.push(final_node);
        }

        this.final_nodes.sort(sort_nodes_by_id);
        // Resize final_nodes in order to insert starting and goal nodes
        mapLogViewer.log("Graph successfully created!");

        // On complete or on finish call callback
        this.busy = false;
        this.processed = true;
        mapLogViewer.log("Map pre-process finished.");

        // Call callback function (if any)
        if (jq.type(callback) != "undefined")
            callback.call(this);
    },
    searchPath: function (startPoint, endPoint) {
        // Check busy status
        if (this.busy)
            return false;

        // Set busy status
        this.busy = true;

        // Log activity
        mapLogViewer.log("Initilizing path search...");

        // Try to go directly from start to finish
        var sePath = Object.create(MapPath);
        var se = sePath.create(startPoint, endPoint, null);
        if (se) {
            // Return path
            this.busy = false;
            mapLogViewer.log("Direct path found...");
            return sePath.path;
        }
        // Try to go in reverse directly
        var esPath = Object.create(MapPath);
        var es = esPath.create(endPoint, startPoint, null);
        if (es) {
            // Return path
            this.busy = false;
            mapLogViewer.log("Direct path found...");
            return esPath.path;
        }

        // Log activity
        mapLogViewer.log("Creating search graph...");

        // Get areas containing start and goal positions
        var s_area, g_area;
        s_area = g_area = -1;
        for (var i = 0; i < this.final_areas.length; i++) {
            if (s_area == -1 && this.final_areas[i].contains(startPoint))
                s_area = this.final_areas[i].id;
            if (g_area == -1 && this.final_areas[i].contains(endPoint))
                g_area = this.final_areas[i].id;

            // Check if both areas are found
            if (s_area != -1 && g_area != -1)
                break;
        }

        // If a point is not valid or not found, stop the search
        if (s_area == -1 || g_area == -1) {
            // Log activity
            mapLogViewer.log("Points are not valid...");

            // Set unbusy and return false
            this.busy = false;
            return false;
        }

        // Create a copy of node list
        this.search_nodes = this.final_nodes;
        // Reset nodes
        for (var i in this.search_nodes)
            this.search_nodes[i].visited = false;

        // Create start and end node
        var startNode = this.getFullNode(this.search_nodes.length, s_area, startPoint.x, startPoint.y, s_area, startPoint.x, startPoint.y);
        this.search_nodes.push(startNode);
        var endNode = this.getFullNode(this.search_nodes.length, g_area, endPoint.x, endPoint.y, g_area, endPoint.x, endPoint.y);
        this.search_nodes.push(endNode);

        // Check if there is a straight path between start and goal first (if nodes are in the same area)
        if (s_area == g_area) {
            var areaPath = Object.create(MapPath);
            var sPath = areaPath.create(endPoint, startPoint, this.final_areas[s_area]);
            return sPath;
        }

        // Create children of start point-node
        for (var i = 0; i < this.final_areas[s_area].nodes.length; i++) {
            // Create temporary node to search for path/distance
            var tempNode = Object.create(MapNode);
            tempNode = this.search_nodes[this.final_areas[s_area].nodes[i]];
            // The node must be in one of the two areas
            var match = (s_area == tempNode.areas[0] || s_area == tempNode.areas[1]);
            if (startNode.id != tempNode.id && match) {
                // Create end map point to get path/distance
                var tempPoint = Object.create(xyLoc);
                tempPoint = ((s_area == tempNode.areas[0]) ? tempNode.items[0].position : tempNode.items[1].position);

                // Get path
                tempNode.distance = startPoint.getAbsDistance(tempPoint);
                tempNode.temp = true;
                startNode.children.push(tempNode);
            }
        }

        // Create parents of goal point-node
        for (var i = 0; i < this.final_areas[g_area].nodes.length; i++) {
            // Create temporary node to search for path/distance
            var tempNode = Object.create(MapNode);
            tempNode = this.search_nodes[this.final_areas[g_area].nodes[i]];
            // The node must be in one of the two areas
            var match = (g_area == tempNode.areas[0] || g_area == tempNode.areas[1]);
            if (match) {
                // Create end map point to get path/distance
                var tempPoint = Object.create(xyLoc);
                tempPoint = ((s_area == tempNode.areas[0]) ? tempNode.items[0].position : tempNode.items[1].position);

                // Get path
                tempNode.distance = startPoint.getAbsDistance(tempPoint);
                tempNode.temp = true;
                this.search_nodes[tempNode.id].children.push(endNode);
            }
        }

        // Print all nodes
        //for (var i=0; i<this.final_nodes.length; i++)
        //MapCanvas.printNode(this.final_nodes[i], "#FF00FF");

        // Log activity
        mapLogViewer.log("Start searching in graph...");

        // Create current node
        var currentNode = Object.create(MapNode);
        currentNode = startNode;

        // Create search front list
        var searchFront = this.getSuccessors(currentNode, endPoint, []);

        // Set goalFound as false
        var goalFound = false;
        var iterations = 0;
        while (!goalFound) {
            // Initialize min distance
            var min = 500000;
            var indx;
            // Search if goal is in the front and get minimum distance in the meantime
            for (var i = 0; i < searchFront.length; i++) {
                // Print node
                if ((endPoint.x == searchFront[i].items[0].position.x && endPoint.y == searchFront[i].items[0].position.y) || (endPoint.x == searchFront[i].items[1].position.x && endPoint.y == searchFront[i].items[1].position.y)) {
                    // Goal found
                    goalFound = true;
                    this.busy = false;

                    // Log activity
                    mapLogViewer.log("Path search finished. Path found.");

                    // Get and return full path
                    return this.extractPath(endPoint, searchFront[i]);
                }
                // Get minimum distance in order to choose the next node later
                if (searchFront[i].total_distance < min) {
                    min = searchFront[i].total_distance;
                    indx = i;
                }
            }
            // If there are nodes in the front, choose the next node (the index is given above)
            if (searchFront.length > 0) {
                currentNode = searchFront[indx];
                this.search_nodes[currentNode.id].visited = true;
                searchFront.splice(indx, 1);
            }

            // Get more successors
            searchFront = this.getSuccessors(currentNode, endPoint, searchFront);

            // If successors are empty, stop the search
            if (searchFront.length == 0)
                break;
        }

        // Return path found
        this.busy = false;
        mapLogViewer.log("Path search finished. No path found.");
        return [];
    },
    getSuccessors: function (parentNode, goalNode, currentFront) {
        // Store special value in variable
        var sqr2 = Math.sqrt(2) - 1;

        // Add connected nodes that are not already in
        for (var i = 0; i < parentNode.children.length; i++) {
            // Create temp node
            var tempNode = Object.create(MapNode);
            tempNode = parentNode.children[i];
            var pos = -1;

            // Look for node in the front
            for (var j = 0; j < currentFront.length; j++)
                if (tempNode.id == currentFront[j].id)
                    pos = j;

            // - Calculate distance to goal (heuristic)
            var dtg1 = (Math.abs(tempNode.items[0].position.x - goalNode.x) > Math.abs(tempNode.items[0].position.y - goalNode.y) ? Math.abs(tempNode.items[0].position.x - goalNode.x) + Math.abs(tempNode.items[0].position.y - goalNode.y) * sqr2 : Math.abs(tempNode.items[0].position.y - goalNode.y) + Math.abs(tempNode.items[0].position.x - goalNode.x) * sqr2);
            var dtg2 = (Math.abs(tempNode.items[1].position.x - goalNode.x) > Math.abs(tempNode.items[1].position.y - goalNode.y) ? Math.abs(tempNode.items[1].position.x - goalNode.x) + Math.abs(tempNode.items[1].position.y - goalNode.y) * sqr2 : Math.abs(tempNode.items[1].position.y - goalNode.y) + Math.abs(tempNode.items[1].position.x - goalNode.x) * sqr2);
            var dtg = (dtg1 < dtg2 ? dtg1 : dtg2);
            //console.log(pos, tempNode.id, this.search_nodes.length, this.search_nodes[tempNode.id]);
            if ((pos == -1 && !this.search_nodes[tempNode.id].visited)) {
                // If node not in the front and not yet visited, insert it
                var f_id = tempNode.id;
                this.search_nodes[f_id].depth = parentNode.depth + 1;
                // Calculate node score
                this.search_nodes[f_id].total_distance = parentNode.total_distance + tempNode.distance + dtg;
                // Set Parent
                this.search_nodes[f_id].parent = parentNode.id;
                currentFront.push(this.search_nodes[f_id]);
            }
            else if (pos > 0 && currentFront.length > 0 && ((parentNode.total_distance + tempNode.distance + dtg) < currentFront[pos].total_distance)) {
                /*
                 * If node is in the front but total distance is smaller than before,
                 * recalculate score and change parent.
                 *
                 */
                currentFront[pos].depth = parentNode.depth + 1;
                currentFront[pos].total_distance = parentNode.total_distance + tempNode.distance + dtg;
                currentFront[pos].parent = parentNode.id;
                this.search_nodes[currentFront[pos].id].parent = parentNode.id;
            }
        }

        // Return altered front
        return currentFront;
    },
    extractPath: function (goalPoint, endNode) {
        // Initialize final path
        var finalPath = [];
        // Create a current node to traverse
        var currentNode = Object.create(MapNode);
        currentNode = endNode;

        // Get the goal area
        var goal_area = (currentNode.items[0].position.x == goalPoint.x && currentNode.items[0].position.y == goalPoint.y ? currentNode.areas[0] : currentNode.areas[1]);
        // Make path from one node_item to another if node_item is on different area
        var start_count_area = ((currentNode.areas[0] == this.search_nodes[currentNode.parent].areas[0] || currentNode.areas[0] == this.search_nodes[currentNode.parent].areas[1]) ? currentNode.areas[0] : currentNode.areas[1]);
        if (start_count_area != goal_area) {
            // Get the end position of the path
            var end_position = ((currentNode.areas[0] == this.search_nodes[currentNode.parent].areas[0] || currentNode.areas[0] == this.search_nodes[currentNode.parent].areas[1]) ? 0 : 1);
            // Get path
            var mPath = Object.create(MapPath);
            mPath.create(goalPoint, currentNode.items[end_position].position, null);
            // Add path to finalPath
            for (var i = 0; i < mPath.path.length; i++)
                finalPath.push(mPath.path[i]);
        }

        while (currentNode.parent != -1) {
            var nextNode = Object.create(MapNode);
            nextNode = this.search_nodes[currentNode.parent];
            if (currentNode.areas[0] == nextNode.areas[0] || currentNode.areas[0] == nextNode.areas[1]) {
                var g = Object.create(xyLoc);
                g = (currentNode.areas[0] == nextNode.areas[0] ? nextNode.items[0].position : nextNode.items[1].position);
                // Get Path from one node to another
                var mPath = Object.create(MapPath);
                mPath.create(currentNode.items[0].position, g, this.final_areas[currentNode.areas[0]]);

                // Get path between the two points of the node
                var g1 = Object.create(xyLoc);
                g1 = (currentNode.areas[0] == nextNode.areas[0] ? nextNode.items[1].position : nextNode.items[0].position);
                var mPath1 = Object.create(MapPath);
                mPath1.create(g, g1);
                for (var i = 0; i < mPath1.path.length; i++)
                    mPath.path.push(mPath1.path[i]);
            }
            else {
                var g = Object.create(xyLoc);
                g = (currentNode.areas[1] == nextNode.areas[0] ? nextNode.items[0].position : nextNode.items[1].position);
                // Get Path from one node to another
                var mPath = Object.create(MapPath);
                mPath.create(currentNode.items[1].position, g, this.final_areas[currentNode.areas[1]]);

                // Get path between the two points of the node
                var g1 = Object.create(xyLoc);
                g1 = (currentNode.areas[1] == nextNode.areas[0] ? nextNode.items[1].position : nextNode.items[0].position);
                var mPath1 = Object.create(MapPath);
                mPath1.create(g, g1);
                for (var i = 0; i < mPath1.path.length; i++)
                    mPath.path.push(mPath1.path[i]);
            }

            // Add path to finalPath
            for (var i = 0; i < mPath.path.length; i++)
                finalPath.push(mPath.path[i]);

            // Get next node
            currentNode = nextNode;
        }
        // Reverse path because it's been extracted from the goal to start
        //std::reverse(finalPath.begin(), finalPath.end());

        // Return final path
        return finalPath;
    },
    // Get a full map node containing items from the two connected areas
    getFullNode: function (node_id, area1_id, p1_x, p1_y, area2_id, p2_x, p2_y) {
        // Create a new map node that covers two areas
        var map_node = Object.create(MapNode).initialize();
        map_node.id = node_id;

        // Create node item for the area 1
        var p1 = Object.create(MapNodeItem).initialize();
        p1.area = area1_id;//current_slices[i-1].area_inserted;
        p1.position.setPosition(p1_x, p1_y);//current_slices[i-1].last, current_slices[i].row);
        map_node.items.push(p1);
        map_node.areas.push(area1_id);//current_slices[i-1].area_inserted);

        // Create node item for the area 2
        var p2 = Object.create(MapNodeItem).initialize();
        p2.area = area2_id;//current_slices[i].area_inserted;
        p2.position.setPosition(p2_x, p2_y);//current_slices[i].first, current_slices[i].row);
        map_node.items.push(p2);
        map_node.areas.push(area2_id);//current_slices[i].area_inserted);

        return map_node;
    }
};
