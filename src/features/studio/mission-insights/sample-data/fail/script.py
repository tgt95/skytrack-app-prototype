"""Search and rescue scenario: fly the waypoints, then land. You can customize the flight scenario by adding additional steps."""

from typing import Any, Iterator
from local_planner import (
  boot_drone,
  takeoff,
  fly_to,
  land,
)

def scenario(ctx: Any) -> Iterator[Any]:
  yield takeoff(alt_m=2.5)
  yield fly_to(north=3, east=1.5, alt_m=2.5)
  yield fly_to(north=12, east=1.5, alt_m=2.5)
  yield fly_to(north=12, east=3.5, alt_m=2.5)
  yield fly_to(north=3, east=3.5, alt_m=2.5)
  yield fly_to(north=3, east=5.5, alt_m=2.5)
  yield fly_to(north=12, east=5.5, alt_m=2.5)
  yield fly_to(north=4.6, east=4.9, alt_m=2.5)
  yield fly_to(north=9.5, east=5.6, alt_m=2.5)
  yield land()

scenario.requires_senses = ["pose", "obstacle", "status"]

def main() -> None:
  with boot_drone() as drone:
    drone.fly(scenario)
    drone.run()

if __name__ == "__main__":
  main()
