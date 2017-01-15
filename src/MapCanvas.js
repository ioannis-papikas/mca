/*
 * Map Canvas Manager
 *
 * Creates and draws a canvas to represent the map.
 *
 */

var jq = jQuery.noConflict();
MapCanvas = {
    canvas: null,
    width: 0,
    height: 0,
    build: function (id, width, height) {
        // Set dimensions
        this.width = width;
        this.height = height;

        // Create map canvas
        this.canvas = jq("<canvas />").attr("id", id).attr("width", width).attr("height", height);
        return this;
    },
    get: function () {
        return this.canvas;
    },
    printMap: function () {
        // Cet canvas drawer
        var cDrawer = this.canvas.get(0).getContext("2d");

        // Clear canvas
        cDrawer.clearRect(0, 0, this.width, this.height);

        // The map is given in a two dimensions bit array
        cDrawer.fillStyle = "#999";
        for (y = 0; y < Map.height; y++)
            for (x = 0; x < Map.width; x++)
                if (!Map.getPoint(x, y))
                    cDrawer.fillRect(x, y, 1, 1);

        return this;
    },
    printPath: function (path, color) {
        // Cet canvas drawer
        var cDrawer = this.canvas.get(0).getContext("2d");

        // Print the path on the canvas
        cDrawer.fillStyle = color;
        for (i in path)
            cDrawer.fillRect(path[i].x, path[i].y, 1, 1);

        return this;
    },
    printNode: function (mapNode, color) {
        // Cet canvas drawer
        var cDrawer = this.canvas.get(0).getContext("2d");

        // Print the node on the map
        cDrawer.fillStyle = color;
        for (i in mapNode.items) {
            var mapItem = mapNode.items[i].position;
            cDrawer.fillRect(mapItem.x, mapItem.y, 1, 1);
        }

        return this;
    },
    printArea: function (mapArea, color) {
        // Cet canvas drawer
        var cDrawer = this.canvas.get(0).getContext("2d");

        // Print the node on the map
        cDrawer.fillStyle = color;
        for (var i = mapArea.start_row; i < mapArea.start_row + mapArea.row_count; i++) {
            var s = mapArea.start_points[i - mapArea.start_row];
            var e = mapArea.end_points[i - mapArea.start_row];
            var width = parseInt(e - s + 1);
            cDrawer.fillRect(s, i, width, 1);
        }

        return this;
    },
    printPoint: function (mapPoint) {
        // Check point
        if (mapPoint.x == -1 || mapPoint.y == -1)
            return;

        // Cet canvas drawer
        var cDrawer = this.canvas.get(0).getContext("2d");

        // Check if point is valid and set color
        if (Map.getPoint(mapPoint.x, mapPoint.y)) {
            cDrawer.fillStyle = "#0D5E92";
            cDrawer.strokeStyle = "#0D5E92";
        } else {
            cDrawer.fillStyle = "#C00403";
            cDrawer.strokeStyle = "#C00403";
        }

        // Print the point center
        cDrawer.fillRect(mapPoint.x, mapPoint.y, 1, 1);

        // Print a small circle around it
        cDrawer.beginPath();
        cDrawer.arc(mapPoint.x, mapPoint.y, 5, 0, 2 * Math.PI);
        cDrawer.stroke();
    },
    clear: function () {
        // Remove canvas from parent
        this.canvas.remove();

        // nullify canvas object to reset
        this.canvas = null;
    }
}