/*
 * xy Location Point
 *
 * This is the xyLoc point that represents points on the map.
 * It provides an object and an interface for functions on points.
 *
 */

xyLoc = {
    x: 0,
    y: 0,
    setPosition: function (x, y) {
        // Set position
        this.x = x;
        this.y = y;
    },
    getAbsDistance: function (point) {
        var sqr2 = Math.sqrt(2) - 1;
        return (Math.abs(this.x - point.x) > Math.abs(this.y - point.y) ? Math.abs(this.x - point.x) + Math.abs(this.y - point.y) * sqr2 : Math.abs(this.y - point.y) + Math.abs(this.x - point.x) * sqr2);
    }
};
