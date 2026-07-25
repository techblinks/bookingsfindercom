\# BookingsFinder V2 — Phase 4 White Label Integration Specification



\## 1. Objective



Integrate the Travelpayouts White Label flight metasearch at:



https://flights.bookingsfinder.com



BookingsFinder should safely hand users from its homepage, flight search, and trip planner into the branded White Label while preserving valid search details and affiliate attribution.



\## 2. Current White Label Status



\- White Label type: Webpage

\- Custom domain: flights.bookingsfinder.com

\- Travelpayouts project: bookingsfinder.com

\- Main language: English

\- Main currency: USD

\- DNS CNAME:

&#x20; - Host: flights

&#x20; - Target: whitelabel.travelpayouts.com

\- DNS propagation: confirmed

\- SSL certificate: pending issuance by Travelpayouts



\## 3. Non-Negotiable Rules



\- Do not guess airport codes.

\- Do not redirect ambiguous city names directly to the White Label.

\- Do not expose secrets or service-role credentials.

\- Do not allow arbitrary outbound redirect hosts.

\- Do not replace the current safe internal fallback until the exact White Label URL format is verified.

\- Existing Phase 3 tracking and tests must remain functional.

\- All changes must be backward-compatible and independently testable.



\## 4. Phase 4A — Current System Audit



Audit:



\- src/lib/travelConfig.ts

\- src/lib/outboundTracking.ts

\- src/services/travelApi.ts

\- src/pages/FlightResults.tsx

\- src/components/trip-cost/tripCostFlightHandoff.ts

\- homepage flight search components

\- airport/location data sources

\- current route and query parameter formats



Document:



\- every current flight CTA

\- every outbound redirect path

\- which flows have IATA codes

\- which flows only have city names

\- existing tracking metadata

\- current fallback behaviour



No production behaviour changes in this phase.



\## 5. Phase 4B — White Label Configuration Layer



Extend the central travel configuration with:



\- White Label enabled flag

\- White Label base URL

\- allowed host

\- optional rollout mode

\- safe fallback route



Recommended configuration:



\- production base URL:

&#x20; https://flights.bookingsfinder.com

\- disabled or fallback mode while SSL is unavailable

\- local/test override support without exposing unsafe hosts



The host must be explicitly allowlisted.



\## 6. Phase 4C — Verified URL Builder



Create a reusable White Label URL builder only after the exact Travelpayouts URL format is verified.



The builder should support, where Travelpayouts supports them:



\- origin IATA code

\- destination IATA code

\- departure date

\- return date

\- trip type

\- adults

\- children

\- infants

\- cabin class

\- locale

\- currency



The builder must:



\- validate IATA codes

\- validate date format and chronology

\- validate passenger counts

\- reject unsafe or unsupported inputs

\- use URL and URLSearchParams

\- never concatenate untrusted strings into a redirect URL

\- return a typed success or fallback result



\## 7. Phase 4D — Airport Resolution Rules



Valid direct handoff:



\- airport selected from trusted airport data

\- IATA code is known and validated



Unsafe direct handoff:



\- free-text city only

\- ambiguous metropolitan area

\- missing airport code

\- unsupported or malformed code



Fallback behaviour:



\- route user internally to /flights

\- preserve dates, passenger count, and free-text location

\- require explicit airport selection

\- only then allow White Label handoff



No static city-to-airport guessing unless the mapping is explicitly verified and tested.



\## 8. Phase 4E — Homepage and Flight Search Integration



Homepage:



\- retain internal flow when airport codes are unavailable

\- use White Label only when both endpoints are verified

\- track the outbound event before redirect



/flights page:



\- add a clear branded CTA such as:

&#x20; “Compare live fares”

\- send validated search details to the White Label

\- preserve the existing internal search/fallback experience

\- display a safe error if URL generation fails



\## 9. Phase 4F — Trip Planner Integration



The trip planner currently stores city names rather than guaranteed IATA codes.



Therefore:



\- retain the Phase 3 internal handoff to /flights

\- do not redirect directly from the planner yet

\- preserve dates and passenger count

\- request exact airport selection on /flights

\- redirect to White Label only after valid airport selection



This phase may improve messaging but must not introduce guessed airport codes.



\## 10. Phase 4G — Tracking and Attribution



Reuse the existing outbound tracking layer.



Track:



\- partner: travelpayouts

\- product: flights

\- source\_page

\- placement

\- origin IATA

\- destination IATA

\- departure date

\- return date

\- passenger count

\- cabin class

\- destination host

\- timestamp



Potential placements:



\- homepage\_hero

\- flight\_results\_cta

\- planner\_handoff

\- route\_page\_cta

\- destination\_page\_cta



Tracking must remain fire-and-forget and must not block navigation.



\## 11. Phase 4H — Rollout Controls



Support rollout states:



\- disabled

\- test

\- enabled



Disabled:

\- current internal/partner flow remains active



Test:

\- White Label available only through explicit test CTA or local configuration



Enabled:

\- validated production searches use White Label



Rollback must require only a configuration change, not code removal.



\## 12. Testing



Add tests for:



\- valid return-trip URL

\- valid one-way URL

\- malformed IATA codes

\- missing airports

\- invalid dates

\- return before departure

\- passenger count limits

\- unsupported cabin class

\- host allowlisting

\- URL encoding

\- tracking metadata

\- planner fallback

\- disabled rollout mode

\- SSL/domain unavailable fallback



Existing tests must continue to pass.



\## 13. Manual Validation



Before production enablement:



\- https://flights.bookingsfinder.com loads with valid SSL

\- direct White Label search works

\- affiliate attribution appears in Travelpayouts

\- homepage handoff works

\- /flights handoff works

\- planner fallback works

\- browser back navigation works

\- mobile behaviour works

\- no console errors

\- no open redirects

\- no secret leakage



\## 14. Release Sequence



1\. Audit existing flow

2\. Commit specification

3\. Add configuration layer

4\. Verify exact Travelpayouts URL format

5\. Add URL builder

6\. Integrate /flights

7\. Preserve planner fallback

8\. Add tracking

9\. Run tests/build/lint baseline

10\. Test White Label attribution

11\. Enable production rollout

12\. Create PR and squash merge



\## 15. Definition of Done



Phase 4 is complete when:



\- the White Label domain has valid SSL

\- verified searches open prefilled White Label results

\- ambiguous searches remain inside BookingsFinder

\- affiliate clicks are tracked

\- attribution is confirmed in Travelpayouts

\- existing tests pass

\- production build passes

\- rollback is configuration-driven

