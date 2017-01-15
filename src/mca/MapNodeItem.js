/*
 * Map Node Item
 *
 * This object represents a map node item as part of a node inside an area that connects.
 *
 */

MapNodeItem = {
    // Area id
    area: -1,
    // The xyLoc position
    position: null,
    // Initialize the map node item
    initialize: function () {
        // Initialize position as a point
        this.area = -1;
        this.position = Object.create(xyLoc);
        return this;
    }
};
