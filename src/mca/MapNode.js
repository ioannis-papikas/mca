/*
 * Map Node
 *
 * This object represents a map node.
 * A map node consists of a number of point locations and connects areas.
 * For creating the graph later, we are going to need all the connected nodes (neighbours).
 *
 */

MapNode = {
    // The unique node id
    id: -1,
    //
    depth: 0,
    // The parent area id ?
    parent: -1,
    // The total distance from the goal?
    total_distance: 0,
    // The distance so far
    distance: 0,
    // Whether we visited this node or not
    visited: false,
    temp: false,
    // The area ids that it connect
    areas: [],
    // The map node items that this node contains
    items: [],
    // All the connected nodes as children
    children: [],
    // Initialize function
    initialize: function () {
        // Initialize map node object
        this.id = -1;
        this.depth = 0;
        this.parent = -1;
        this.total_distance = 0;
        this.visited = false;
        this.temp = false;
        this.areas = [];
        this.items = [];
        this.children = [];
        return this;
    }
};
