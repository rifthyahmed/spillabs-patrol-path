
# Patrol Path – SPIL Labs Geometry Test

This is my solution for the **Software Engineer – Geometry & Backend Systems** role at SPIL Labs.
The problem: given axis‑aligned rectangles, find the shortest closed patrol path that encloses all of them without going inside any rectangle.

## Demo
<video width="100%" controls>
  <source src="./demo.webm" type="video/webm">
  Your browser does not support the video tag.
</video>

## My Solution in a Nutshell

I collect all rectangle corners, compute the **convex hull** of those points (the smallest convex polygon containing them), and output its perimeter.
The hull is exactly the optimal patrol path – this is a known geometric fact.

---

## Answers to the Tasks (from the quiz PDF)

### 1.(a) How to transform rectangle problem into a point problem?

Each rectangle has 4 corners. For a rectangle given by opposite corners `(x1,y1)` and `(x2,y2)`, the four points are:

- `(x1, y1)`
- `(x1, y2)`
- `(x2, y1)`
- `(x2, y2)`

I collect all `4N` points from all rectangles. The problem becomes: find the convex hull of this set of points. That's it – no more rectangles, just points.

### 1.(b) Why is the convex hull of rectangle corners the optimal patrol path?

Imagine you have a rubber band that you stretch around all rectangle corners. The rubber band will snap to the **convex hull** – the smallest convex shape containing them. Any path that encloses all rectangles must also enclose all corners, so it must at least be as long as that rubber band. Also, if the path were not convex, you could “cut off” the concave parts and make it shorter (triangle inequality). Therefore the shortest possible path is exactly the convex hull boundary. The hull doesn’t cut through rectangles because rectangles are convex and their corners are extreme. So it’s both feasible and optimal.

### 1.(c) Algorithm – Andrew’s monotone chain

I use **Andrew’s monotone chain** because it’s simple, runs in `O(N log N)`, and handles collinear points cleanly.

- **Why sorting?** We need to process points in a predictable order. I sort all points by `x`, then by `y`. This allows us to build the lower hull from left to right and the upper hull from right to left.
- **How cross products work:** For three points `O`, `A`, `B`, the cross product `(A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x)` tells us if we turn left (`>0`), right (`<0`), or go straight (`=0`). While building the hull, we keep only points that make a **left turn** (counter‑clockwise). If we see a right turn, we pop the middle point – it’s not part of the hull.
- **Time complexity:** Sorting is `O(N log N)`. The hull construction loops through points twice, each with at most one push/pop per point → `O(N)`. Total `O(N log N)`, which is fine for `N ≤ 200,000`.

#### Alternative Convex Hull Algorithms (Short)
For a back-end focused full‑stack developer who doesn’t live in math land, choosing the right algorithm is about simplicity, speed, and reliability. Here’s a quick comparison of the three main alternatives, and why I stuck with Andrew.
- **Graham scan**: Sorts by polar angle → slower, more floating‑point issues.
- **Jarvis march (gift wrapping)**: O(N·h) – can be O(N²) worst case (too slow for 200k rectangles).
- **QuickHull**: Average O(N log N) but worst‑case O(N²); more complex to implement.

**Why I chose Andrew’s monotone chain**:
- Guaranteed **O(N log N)** time (sorting + two linear passes).
- No angle calculations – only fast cross products.
- Simple, stable, and easy to code.
- Handles collinear points cleanly.

No need for fancier algorithms – monotone chain is the reliable industry standard for this problem.

### 2. Mathematical formulas used

- **Cross product / orientation:**
  `cross(O,A,B) = (A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x)`
- **Euclidean distance:**
  `dist(P,Q) = sqrt((Q.x-P.x)^2 + (Q.y-P.y)^2)`
- **Perimeter of convex hull:**
  For hull points in order `P0, P1, ..., P{m-1}`:
  `perimeter = sum_{i=0}^{m-1} dist(Pi, P_{(i+1) mod m})`

### 3. Code solution

I implemented this in **Rust** for the backend (fast, safe) and **React** for a visual frontend.
The backend exposes a single endpoint `POST /api/patrol` that accepts a JSON array of rectangles and returns the convex hull points.
The frontend lets you draw rectangles on a grid, click a button to call the API, and then animates the patrol route.

#### Key code files and functions

- **Backend** (`backend/src/main.rs`):
  - `cross(o, a, b) -> f64` – cross product.
  - `convex_hull(points) -> Vec<Point>` – Andrew’s algorithm.
  - `patrol_path(rectangles) -> HttpResponse` – API handler.
- **Frontend** (`frontend/src/`):
  - `Canvas.js` – draws grid, rectangles, and animated hull.
  - `App.js` – manages rectangles state and calls API.
  - `api.js` – `fetchPatrolPath` sends POST request.

---

## How to Run the Program

### Requirements

- **Docker Desktop** (Windows / macOS / Linux)
- Or if running natively: Rust (1.70+), Node.js (18+)

### Running with Docker (recommended)

I prepared two Docker Compose files:

| File | Environment | Access URL |
|------|-------------|-------------|
| `docker-compose.dev.yml` | Development (hot reload) | `http://localhost:3000` |
| `docker-compose.prod.yml` | Production (optimised) | `http://localhost` |

**To run development mode (with live code reload):**

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Then open `http://localhost:3000`.

**To run production mode:**

```bash
docker-compose -f docker-compose.prod.yml up --build
```

Then open `http://localhost`.

### Using the UI

1. **Draw rectangles**: click and drag on the grid. Release to create a rectangle.
2. **Add multiple** rectangles repeat the same way.
3. **Click "Draw Patrol Route"** – the frontend sends rectangle data to the Rust backend, which computes the convex hull and returns the points. The red patrol path then draws itself with a smooth 0.8 second animation.

### Manual (without Docker)

If you prefer to run locally:

**Backend:**

```bash
cd backend
cargo run --release
# listens on http://localhost:8080
```

**Frontend:**

```bash
cd frontend
npm install
npm start
# opens on http://localhost:3000
```

Note: In development, the frontend proxies API requests to `http://backend:8080` thanks to the `"proxy"` field in `package.json`. So you must have the backend running.

---

## What the Code Looks Like (Rust snippet)

```rust
fn cross(o: &Point, a: &Point, b: &Point) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

fn convex_hull(points: &mut Vec<Point>) -> Vec<Point> {
    points.sort_by(|a,b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));
    points.dedup();
    if points.len() <= 1 { return points.clone(); }

    let mut lower = Vec::new();
    for p in points.iter() {
        while lower.len() >= 2 && cross(&lower[lower.len()-2], &lower[lower.len()-1], p) <= 0.0 {
            lower.pop();
        }
        lower.push(*p);
    }

    let mut upper = Vec::new();
    for p in points.iter().rev() {
        while upper.len() >= 2 && cross(&upper[upper.len()-2], &upper[upper.len()-1], p) <= 0.0 {
            upper.pop();
        }
        upper.push(*p);
    }

    lower.pop();
    upper.pop();
    lower.append(&mut upper);
    lower
}
```

The full code is in the repository.

---

## Why I Chose This Approach

- **It’s simple**: No need for complex collision detection or path searching – convex hull is a standard algorithm.
- **It’s fast**: `O(N log N)` easily handles 200,000 rectangles.
- **It’s accurate**: The hull perimeter gives the mathematically optimal path.
- **Full‑stack ready**: I could demonstrate both geometry and web integration.

The frontend animation is just a bonus to visualise the result, but the core algorithm lives in the Rust backend and meets all the performance requirements.

---

## Links

- **GitHub repository**: [https://github.com/rifthyahmed/spillabs-patrol-path](https://github.com/rifthyahmed/spillabs-patrol-path)
- **Live demo** (if deployed): not public, but you can run it locally via Docker.

Thank you for reviewing my solution – I’m excited about the opportunity to work on geometry problems and backend systems at SPIL Labs!
