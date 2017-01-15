/*
 * Map Path Structure
 *
 * This is a map path structure.
 * It is capable to store a path as an array of points with its distance.
 * It can find manhattan path between two points given the map.
 * It can also find path between two points in an manhattan-cohesive area.
 *
 */

MapPath = {
    path: [],
    distance: 0,
    create: function (startPoint, endPoint, mapArea) {
        // Check map
        if (!Map.map)
            return false;

        // Initialize path
        this.path = [];
        this.distance = 0;

        // Calculate the path

        // Set next point as startPoint
        var nextPoint = Object.create(xyLoc);
        nextPoint.x = startPoint.x;
        nextPoint.y = startPoint.y;

        // Calculate step in each axis
        var factor_x = (startPoint.x > endPoint.x ? -1 : 1);
        var factor_y = (startPoint.y > endPoint.y ? -1 : 1);

        // Add initial path point
        var pathPoint = Object.create(xyLoc);
        pathPoint.x = startPoint.x;
        pathPoint.y = startPoint.y;
        this.path.push(pathPoint);

        while (Math.abs(nextPoint.x - endPoint.x) > 0 || Math.abs(nextPoint.y - endPoint.y) > 0) {
            // Create copy of next point to compare later
            var lastPoint = Object.create(xyLoc);
            lastPoint.x = nextPoint.x;
            lastPoint.y = nextPoint.y;

            // Calculate distance in each axis
            var d_x = Math.abs(nextPoint.x - endPoint.x);
            var d_y = Math.abs(nextPoint.y - endPoint.y);
            // Diagonal is preferred than cardinal
            // If diagonal is possible, move diagonal
            if (d_x > 0 && d_y > 0) {
                nextPoint.x += factor_x;
                nextPoint.y += factor_y;
            }
            else if (d_x > 0)
                nextPoint.x += factor_x;
            else
                nextPoint.y += factor_y;

            // If Next is not a valid position or is diagonal and cardinal are not valid
            if (!Map.getPoint(nextPoint.x, nextPoint.y)
                || (mapArea != null && !mapArea.contains(nextPoint) && Math.abs(nextPoint.x - lastPoint.x) && Math.abs(nextPoint.y - lastPoint.y))
                || (Math.abs(nextPoint.x - lastPoint.x) && Math.abs(nextPoint.y - lastPoint.y))) {
                // If is a cardinal move and there is a wall, no path
                if (!Map.getPoint(nextPoint.x, nextPoint.y) && !(Math.abs(nextPoint.x - lastPoint.x) && Math.abs(nextPoint.y - lastPoint.y)))
                    return false;
                if (!Map.getPoint(nextPoint.x, lastPoint.y)) {
                    // If vertical is not a valid position, step horizontal
                    nextPoint.x = lastPoint.x;
                    nextPoint.y = lastPoint.y + factor_y;
                    this.distance++;
                    // Check area
                    if (mapArea != null && !mapArea.contains(nextPoint))
                        return false;
                }
                else if (!Map.getPoint(lastPoint.x, nextPoint.y)) {
                    // If horizontal is not a valid position, step vertical
                    nextPoint.y = lastPoint.y;
                    nextPoint.x = lastPoint.x + factor_x;
                    this.distance++;
                    // Check area
                    if (mapArea != null && !mapArea.contains(nextPoint))
                        return false;
                }
                else {
                    // Check if area contains next point
                    if (mapArea != null && !mapArea.contains(nextPoint)) {
                        // Get vertical next point
                        nextPoint.x = lastPoint.x;
                        nextPoint.y = lastPoint.y + factor_y;
                        if (!mapArea.contains(nextPoint)) {
                            nextPoint.x = lastPoint.x + factor_x;
                            nextPoint.y = lastPoint.y;
                            // If both cardinal directions are invalid, no path
                            if (!mapArea.contains(nextPoint))
                                return false;
                        }
                        // Add distance
                        this.distance++;
                    } else {
                        // It's a diagonal move, add sqrt(2) to real_distance
                        this.distance += 1.4142;
                    }
                }

                // At last, if move is not valid again, no path
                if (!Map.getPoint(nextPoint.x, nextPoint.y))
                    return false;
            }
            else
                this.distance++;

            // Create path point
            var pathPoint = Object.create(xyLoc);
            pathPoint.x = nextPoint.x;
            pathPoint.y = nextPoint.y;
            this.path.push(pathPoint);
        }

        return true;
    },
    get: function () {
        return this.path;
    }
};
