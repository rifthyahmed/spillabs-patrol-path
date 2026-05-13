use actix_web::{post, web, App, HttpResponse, HttpServer, Result};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct Rectangle { x1: f64, y1: f64, x2: f64, y2: f64 }

#[derive(Debug, Serialize, Clone, Copy)]
struct Point { x: f64, y: f64 }

#[post("/api/patrol")]
async fn patrol_path(rectangles: web::Json<Vec<Rectangle>>) -> Result<HttpResponse> {
    let mut points = Vec::new();
    for rect in rectangles.iter() {
        points.push(Point { x: rect.x1, y: rect.y1 });
        points.push(Point { x: rect.x1, y: rect.y2 });
        points.push(Point { x: rect.x2, y: rect.y1 });
        points.push(Point { x: rect.x2, y: rect.y2 });
    }
    let hull = convex_hull(&mut points);
    Ok(HttpResponse::Ok().json(hull))
}

fn cross(o: &Point, a: &Point, b: &Point) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

fn convex_hull(points: &mut Vec<Point>) -> Vec<Point> {
    if points.len() <= 1 { return points.clone(); }
    points.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap().then(a.y.partial_cmp(&b.y).unwrap()));
    points.dedup_by(|a, b| a.x == b.x && a.y == b.y);
    let n = points.len();
    if n <= 2 { return points.clone(); }
    let mut lower = Vec::new();
    for p in points.iter() {
        while lower.len() >= 2 && cross(&lower[lower.len()-2], &lower[lower.len()-1], p) <= 0.0 { lower.pop(); }
        lower.push(*p);
    }
    let mut upper = Vec::new();
    for p in points.iter().rev() {
        while upper.len() >= 2 && cross(&upper[upper.len()-2], &upper[upper.len()-1], p) <= 0.0 { upper.pop(); }
        upper.push(*p);
    }
    lower.pop();
    upper.pop();
    lower.append(&mut upper);
    lower
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    println!("Backend listening on http://0.0.0.0:8080");
    HttpServer::new(|| {
        App::new()
            .wrap(Cors::default().allow_any_origin().allow_any_method().allow_any_header())
            .service(patrol_path)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
