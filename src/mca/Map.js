/*
 * Map Object
 *
 * It is the map object manager.
 * It loads the map into memory and provides an interface for properties.
 *
 */

Map = {
    map: [],
    height: 0,
    width: 0,
    minHeight: 10,
    loadMap: function (mapContent) {
        // Validate a given map for the right format
        var rows = mapContent.trim().split("\n");

        // Check minimum size of rows
        if (rows.length < (this.minHeight + 2)) {
            return false;
        }

        // First two rows must be dimensions
        this.height = parseInt(rows[0].match(/([0-9]+)/g));
        this.width = parseInt(rows[1].match(/([0-9]+)/g));
        if (isNaN(this.height) || this.height == 0 || isNaN(this.width) || this.width == 0) {
            //mapLogViewer.log("There is an error in map dimensions.");
            return false;
        }

        // Remove first two rows
        rows.splice(0, 2);

        // Check map dimensions
        if (rows.length != this.height) {
            //mapLogViewer.log("Map doesn't match given dimensions.");
            return false;
        }

        // Initialize map and parse rows
        this.map = new Array(this.height);
        for (n in rows) {
            // Create map line array
            var mapLine = [];
            for (i = 0; i < this.width; i++) {
                mapLine[i] = (rows[n][i] == "." ? 1 : 0);
            }

            // Add map line
            this.map[n] = mapLine;
        }

        //mapLogViewer.log("Map loaded successfully!");
        return true;
    },
    getPoint: function (x, y) {
        if (x < this.width && y < this.height) {
            return this.map[y][x];
        }

        return 0;
    },
    clear: function () {
        this.map = [];
        this.height = 0;
        this.width = 0;
    }
};
