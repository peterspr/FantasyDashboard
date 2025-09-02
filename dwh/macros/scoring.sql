{% macro score_points(scoring_alias, rec, rec_yds, rec_tds, rush_yds, rush_tds, pass_yds, pass_tds, ints, fumbles) -%}
  -- Calculate fantasy points using scoring weights
  ({{ rec }} * sw.reception)
  + ({{ rec_yds }} * sw.rec_yd)
  + ({{ rec_tds }} * sw.rec_td)
  + ({{ rush_yds }} * sw.rush_yd)
  + ({{ rush_tds }} * sw.rush_td)
  + ({{ pass_yds }} * sw.pass_yd)
  + ({{ pass_tds }} * sw.pass_td)
  + ({{ ints }} * sw.int)
  + ({{ fumbles }} * sw.fumble)
{%- endmacro %}