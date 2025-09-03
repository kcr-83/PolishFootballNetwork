using PolishFootballNetwork.Domain.Exceptions;

namespace PolishFootballNetwork.Domain.ValueObjects;

/// <summary>
/// Represents a 2D coordinate point with x and y values.
/// Used for positioning clubs on the visualization graph.
/// </summary>
public class Point2D : ValueObject
{
    /// <summary>
    /// Gets the X coordinate value.
    /// </summary>
    public double X { get; private set; }

    /// <summary>
    /// Gets the Y coordinate value.
    /// </summary>
    public double Y { get; private set; }

    /// <summary>
    /// Initializes a new instance of the Point2D class.
    /// </summary>
    /// <param name="x">The X coordinate value.</param>
    /// <param name="y">The Y coordinate value.</param>
    /// <exception cref="DomainException">Thrown when coordinates are invalid.</exception>
    public Point2D(double x, double y)
    {
        ValidateCoordinates(x, y);
        X = x;
        Y = y;
    }

    /// <summary>
    /// Creates a Point2D at the origin (0, 0).
    /// </summary>
    /// <returns>A Point2D at coordinates (0, 0).</returns>
    public static Point2D Origin() => new(0, 0);

    /// <summary>
    /// Creates a Point2D with the specified coordinates.
    /// </summary>
    /// <param name="x">The X coordinate value.</param>
    /// <param name="y">The Y coordinate value.</param>
    /// <returns>A new Point2D instance.</returns>
    public static Point2D Create(double x, double y) => new(x, y);

    /// <summary>
    /// Calculates the distance between this point and another point.
    /// </summary>
    /// <param name="other">The other point to calculate distance to.</param>
    /// <returns>The Euclidean distance between the two points.</returns>
    /// <exception cref="ArgumentNullException">Thrown when other point is null.</exception>
    public double DistanceTo(Point2D other)
    {
        ArgumentNullException.ThrowIfNull(other);
        
        double deltaX = X - other.X;
        double deltaY = Y - other.Y;
        return Math.Sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    /// <summary>
    /// Moves the point by the specified offset.
    /// </summary>
    /// <param name="deltaX">The X offset to move by.</param>
    /// <param name="deltaY">The Y offset to move by.</param>
    /// <returns>A new Point2D with the moved coordinates.</returns>
    public Point2D Move(double deltaX, double deltaY)
    {
        return new Point2D(X + deltaX, Y + deltaY);
    }

    /// <summary>
    /// Validates the coordinate values.
    /// </summary>
    /// <param name="x">The X coordinate to validate.</param>
    /// <param name="y">The Y coordinate to validate.</param>
    /// <exception cref="DomainException">Thrown when coordinates are invalid.</exception>
    private static void ValidateCoordinates(double x, double y)
    {
        if (double.IsNaN(x) || double.IsInfinity(x))
            throw new DomainException("X coordinate cannot be NaN or infinity.");

        if (double.IsNaN(y) || double.IsInfinity(y))
            throw new DomainException("Y coordinate cannot be NaN or infinity.");

        // Optional: Add bounds validation if needed for your use case
        const double maxCoordinate = 10000;
        const double minCoordinate = -10000;

        if (x < minCoordinate || x > maxCoordinate)
            throw new DomainException($"X coordinate must be between {minCoordinate} and {maxCoordinate}.");

        if (y < minCoordinate || y > maxCoordinate)
            throw new DomainException($"Y coordinate must be between {minCoordinate} and {maxCoordinate}.");
    }

    /// <summary>
    /// Gets the equality components for value object comparison.
    /// </summary>
    /// <returns>The X and Y coordinates for equality comparison.</returns>
    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return X;
        yield return Y;
    }

    /// <summary>
    /// Returns a string representation of the point.
    /// </summary>
    /// <returns>A string in the format "(X, Y)".</returns>
    public override string ToString()
    {
        return $"({X:F2}, {Y:F2})";
    }
}
