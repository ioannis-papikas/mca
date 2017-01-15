/*
 * Map Area Slice
 *
 * This is a map slice containing an amount points in a single row (like a slice).
 *
 */

MapSlice = {
    // Slice row
    row: -1,
    // The first point x index
    first: 0,
    // The last point x index
    last: 0,
    // Whether the slice has been inserted into an area
    inserted: false,
    // The area id that the slice is connected to
    area_connected: -1,
    // The area id that the slice is inserted to
    area_inserted: -1,
    // The slice size
    size: 0,
    //
    ids: [],
    // Initialize the slice
    initialize: function (row) {
        this.row = row;
        this.first = 0;
        this.last = 0;
        this.inserted = false;
        this.area_connected = -1;
        this.area_inserted = -1;
        this.ids = [];
        return this;
    },
    setfirst: function (firstX) {
        this.first = firstX;
    },
    setLast: function (lastX) {
        this.last = lastX;
        this.size = this.last - this.first + 1;
    },
    merge_slice: function (newSlice) {
        this.setLast(newSlice.last);
    }
};
