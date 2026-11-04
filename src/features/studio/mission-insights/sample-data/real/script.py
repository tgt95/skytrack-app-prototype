"""Rescue route scenario: fly the waypoints, then land. You can customize the flight scenario by adding additional steps."""

from typing import Any, Iterator
from local_planner import (
  boot_drone,
  takeoff,
  fly_to,
  land,
)

def scenario(ctx: Any) -> Iterator[Any]:
  yield takeoff(alt_m=2.0)
  yield fly_to(north=1.5, east=-1.0, alt_m=2.4)
  yield fly_to(north=4.5, east=-0.9, alt_m=3.0)
  yield fly_to(north=9.6, east=0.1, alt_m=3.1)
  yield fly_to(north=11.0, east=0.3, alt_m=3.0)
  yield fly_to(north=10.8, east=2.8, alt_m=2.2)
  yield fly_to(north=10.6, east=3.4, alt_m=1.6)
  yield fly_to(north=6.3, east=2.7, alt_m=2.6)
  yield fly_to(north=8.0, east=1.3, alt_m=2.8)
  yield fly_to(north=6.5, east=0.3, alt_m=2.4)
  yield fly_to(north=1.5, east=0.3, alt_m=1.2)
  yield land()

scenario.requires_senses = ["pose", "obstacle", "status"]

def main() -> None:
  with boot_drone() as drone:
    drone.fly(scenario)
    drone.run()

if __name__ == "__main__":
  main()
