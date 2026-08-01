# NAVIGATION_SPEC.md

# DESIRE PATH Navigation Specification

This document defines the behavior of navigation throughout DESIRE PATH.

It is the canonical specification for determining visible paths between encounters.

All implementations should follow this document.

---

# Overview

At any moment, the visitor inhabits exactly one encounter.

The map is never completely visible.

Instead, each encounter reveals a local neighborhood whose composition depends upon the currently selected dimensions of nearness.

Navigation therefore consists of moving from one encounter to another through visible paths.

---

# Dimensions

The visitor may choose any combination of the following dimensions:

☑ Place

☑ Time

☑ Feeling

☑ Knowing

All four dimensions are selected by default.

At least one dimension must always remain selected.

The selected dimensions determine how nearness is calculated.

---

# Distance

Each pair of encounters possesses an independent normalized distance within every dimension.

For two encounters A and B:

D_place(A,B)

D_time(A,B)

D_feeling(A,B)

D_knowing(A,B)

Each distance is normalized to the interval:

0.0 → 1.0

Where:

0.0 = identical

1.0 = maximally distant

Normalization should occur independently within each dimension.

---

# Composite Nearness

There is no explicit "composite mode."

Instead, nearness is calculated using whichever dimensions are currently selected.

If the selected dimensions are:

S

then

D(A,B)

is defined as the arithmetic mean of every selected dimension.

Formally,

D(A,B)

=

Σ Ds(A,B)

──────────────

|S|

where s belongs to S.

Examples:

Place + Time

↓

(Dplace + Dtime)/2

Place + Feeling + Knowing

↓

(Dplace + Dfeeling + Dknowing)/3

All four dimensions selected

↓

(Dplace + Dtime + Dfeeling + Dknowing)/4

Every selected dimension contributes equally.

No weighting is currently applied.

---

# Visible Neighborhood

The visitor never sees every encounter.

Instead, navigation operates on a visible neighborhood surrounding the current encounter.

The neighborhood is recalculated whenever:

• the visitor enters a new encounter

• the selected dimensions change

---

# Percentile Threshold

For every possible dimension combination, calculate all pairwise distances.

The visibility threshold is defined by a percentile rather than a fixed numerical distance.

This ensures that the definition of "near" adapts naturally as the archive grows.

The percentile value should remain configurable.

Changing the percentile should not require changes to encounter data.

---

# Neighborhood Construction

For the current encounter:

1.

Calculate the distance to every other encounter using the currently selected dimensions.

2.

Select every encounter whose distance falls within the current percentile threshold.

3.

Remove the current encounter.

4.

Sort remaining encounters by increasing distance.

5.

If fewer than three encounters remain:

supplement using the nearest encounters outside the threshold until three are visible.

6.

If more than six encounters remain:

retain only the six nearest.

The resulting visible neighborhood therefore always contains:

minimum:

3 encounters

maximum:

6 encounters

---

# Retrace

Retrace is determined entirely by navigation history.

It is not determined by dimensional distance.

Retrace always returns the visitor to the immediately previous encounter.

If the previous encounter already appears within the visible neighborhood, it should not be duplicated.

Instead, that encounter simply gains the additional semantic role of Retrace.

---

# Reachability

Every encounter in the archive should eventually be reachable.

The generated navigation graph must therefore remain connected.

If threshold-based neighborhoods fail to produce a connected graph, additional bridge paths may be generated.

Bridge paths should be chosen using the smallest available distance necessary to restore connectivity.

The visitor should never encounter a permanently isolated region of the archive.

---

# Paths

A path represents a currently traversable relationship between two encounters.

Paths are not permanent.

Changing the selected dimensions recalculates the visible neighborhood and therefore the visible paths.

The underlying encounter data does not change.

Only the currently visible topology changes.

---

# Geography

Encounter locations remain geographically fixed.

Changing dimensions does not reposition encounters.

Instead, changing dimensions changes the visible paths between them.

Geographic space therefore remains visually stable while relational topology changes.

This distinction is fundamental to the project.

---

# Opacity

The map intentionally withholds complete knowledge.

Only the current encounter and its visible neighborhood should appear prominently.

The visitor should never receive an overview of the complete encounter network.

Understanding should emerge through movement.

---

# Future Development

Future versions may include:

• additional dimensions

• learned distance metrics

• crowdsourced encounters

• alternative neighborhood-generation algorithms

These additions should not alter the conceptual navigation model defined here.

The project should always remain organized around:

encounters,

paths,

local visibility,

and multidimensional nearness.