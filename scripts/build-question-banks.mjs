import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "course-delivery/question-banks");
const updated = "2026-08-21";

const q = (topic, mapsTo, prompt, options, correctIndex, explanation) => ({
  type: "multiple-choice",
  topic,
  mapsTo,
  prompt,
  options,
  correctIndex,
  explanation,
});

const bricklayer = [
  q("Safe systems of work", ["K3", "S1"], "Before starting unfamiliar bricklaying work, which information should be checked first?", ["Only the delivery ticket", "The risk assessment, method statement and current drawings", "The previous gang's timesheet", "Only the weather forecast"], 1, "The safe method and current job information must be understood before work begins."),
  q("PPE and RPE", ["K2", "S2"], "A task will create respirable silica dust while cutting masonry. What is the best control approach?", ["Work faster so exposure is shorter", "Use suitable dust suppression or extraction and the specified face-fit-tested RPE", "Wear ordinary glasses only", "Cut indoors so dust cannot spread"], 1, "Engineering controls should reduce the dust at source, with suitable RPE used as specified."),
  q("Power tools", ["K14", "S1"], "What should happen before changing a disc on a masonry saw?", ["Leave the tool running slowly", "Disconnect or isolate the power and follow the manufacturer's procedure", "Cool the disc with mortar", "Remove the guard for easier access"], 1, "Isolation prevents accidental start-up while the disc is being changed."),
  q("Sustainability", ["K4", "S3", "B2"], "Which action best protects surface water during bricklaying?", ["Wash wet mortar into a drain", "Contain washout and dispose of it using the site procedure", "Dilute wash water until it looks clear", "Leave washout beside the kerb"], 1, "Cementitious washout must be contained so it cannot pollute drains or watercourses."),
  q("Moisture protection", ["K6", "K8"], "What is the main purpose of a damp-proof course in masonry?", ["To increase the mortar strength", "To resist moisture passing through the construction", "To make the wall easier to paint", "To replace wall ties"], 1, "A correctly placed DPC forms a barrier to moisture movement."),
  q("Cavity trays", ["K22", "S11"], "Why are weep vents provided above a cavity tray?", ["To hold insulation in place", "To allow collected moisture to drain to the outside", "To strengthen the lintel", "To ventilate the room"], 1, "Weeps provide a discharge route for water intercepted by the tray."),
  q("Wall ties", ["K22", "S11"], "How should a cavity wall tie normally be installed?", ["Sloping down toward the inner leaf", "To the specified spacing and orientation, with the drip positioned to prevent water crossing", "Touching the back of the outer leaf only", "Bent around insulation wherever convenient"], 1, "Tie type, spacing, embedment and orientation must follow the design and manufacturer's requirements."),
  q("Brick bonds", ["K15"], "What is the main reason for maintaining the specified lap in bonded brickwork?", ["To reduce the number of perpends", "To avoid continuous vertical joints and achieve the intended bond", "To make every course a soldier course", "To remove the need for line and level checks"], 1, "Correct lap prevents stacked perpends and maintains the specified bond."),
  q("Setting out", ["K21", "S10"], "What is a gauge rod used for when setting out masonry?", ["Checking electrical voltage", "Transferring and checking course heights and vertical features", "Measuring mortar strength", "Cleaning the cavity"], 1, "A gauge rod helps keep course heights and related features consistent."),
  q("Accuracy", ["K21", "S10"], "Which check best confirms that a rectangular opening is square?", ["Measure only its width", "Compare the two diagonal measurements", "Count the bricks in one jamb", "Check only the first course"], 1, "Equal diagonals are a useful check that a rectangle is square."),
  q("Mortar", ["K20", "S14"], "Where should the required mortar mix and proportions be confirmed?", ["From colour alone", "From the current specification or approved mix information", "From whichever mix was used on the last job", "By adding cement until it feels stiff"], 1, "The specified mix must be followed rather than guessed from appearance."),
  q("Weather protection", ["K25", "S17"], "Frost is forecast before fresh masonry has cured. What is the correct response?", ["Add unapproved antifreeze", "Follow the cold-weather method and protect or postpone the work as required", "Soak the wall with water", "Remove all joint finishes"], 1, "Fresh masonry must be protected using the approved cold-weather arrangements."),
  q("Movement joints", ["K19"], "Why is a movement joint included in a masonry elevation?", ["To replace a DPC", "To accommodate designed movement and reduce uncontrolled cracking", "To carry wall ties", "To make the wall permanently rigid"], 1, "Movement joints allow expected expansion, contraction or other movement at designed locations."),
  q("Cavity quality", ["K22", "S11", "B3"], "Why should mortar droppings be kept clear of the cavity?", ["They improve insulation", "They can bridge moisture and obstruct cavity components", "They make ties easier to see", "They increase ventilation"], 1, "A clean cavity helps prevent moisture bridging and allows components to work as designed."),
  q("Feature courses", ["K23"], "In a soldier course, how are the bricks normally oriented?", ["Laid flat with the long face horizontal", "Set vertically on end with the narrow face showing", "Placed diagonally through the cavity", "Laid as headers in every leaf"], 1, "A soldier course uses bricks standing vertically, subject to the drawing and specification."),
  q("Raking cuts", ["K30", "S22"], "What gives the most reliable line for a wall with a raking cut?", ["Cut each unit by eye", "Set out the rake from the drawing and use a controlled template or line", "Make the final course level", "Increase every bed joint randomly"], 1, "Accurate set-out and a consistent guide keep the rake to the required line."),
  q("Masonry repair", ["K24", "S16"], "Before replacing a damaged brick, what should be established?", ["Only the nearest merchant", "The cause, the approved repair method and a compatible replacement", "That the new brick is the brightest colour", "That all surrounding mortar can be removed at once"], 1, "A repair should address the cause and use a compatible method and material."),
  q("Estimating", ["K12", "S6"], "A drawing quantity is calculated before ordering bricks. What should be added where the project information requires it?", ["An arbitrary amount", "The specified allowance for cuts, damage and waste", "A second full order", "Nothing under any circumstances"], 1, "A justified waste allowance helps provide enough material without excessive over-ordering."),
  q("Drawings", ["K10", "S5"], "A figured dimension conflicts with a measurement scaled from the drawing. What should you do?", ["Use the scaled measurement", "Stop and seek clarification using the project procedure", "Average the two values", "Change the drawing"], 1, "Conflicting information must be clarified; drawings should not be altered or guessed."),
  q("Joint finishes", ["K17", "S12"], "When should a mortar joint normally be finished?", ["At a consistent stage when the mortar is firm enough to form the specified profile", "Only after the wall is painted", "While the mortar is running wet", "After the scaffold is removed"], 0, "Consistent timing helps produce the specified profile without smearing or tearing the mortar."),
  q("Communication", ["K26", "K27", "S18", "B6"], "A delivery will block another trade's access. What is the best action?", ["Say nothing until it arrives", "Coordinate the timing and access with the relevant people", "Move their materials without permission", "Cancel the delivery yourself"], 1, "Early, clear coordination helps the wider build team work safely and efficiently."),
  q("Inclusion", ["K28", "S19", "B4"], "Which behaviour supports an inclusive site culture?", ["Using unwanted nicknames", "Listening respectfully and challenging inappropriate behaviour through the correct route", "Excluding new starters from briefings", "Sharing personal information as a joke"], 1, "Respectful communication and appropriate challenge support inclusion and dignity at work."),
  q("Wellbeing", ["K31", "S21", "B1"], "A colleague says they are struggling and it is affecting safe work. What is the best first response?", ["Tell everyone on site", "Listen, encourage appropriate support and follow the site's safety arrangements", "Ignore it because it is private", "Give medical advice"], 1, "Support should be respectful, confidential where possible and linked to suitable workplace or professional help."),
  q("Hand tools", ["K13", "S9"], "What should be done with a damaged bricklaying hand tool?", ["Keep using it until the shift ends", "Remove it from use and repair or replace it through the correct procedure", "Hide the defect with tape", "Lend it to another operative"], 1, "Damaged tools should not remain in use because they can cause poor work or injury."),
];

const carpentryCommon = [
  q("Safe systems of work", ["K3", "S1"], "Before starting a new carpentry task, what should be confirmed?", ["Only the finish time", "The current risk assessment, method and work information", "The previous task's cutting list", "Only who supplied the timber"], 1, "The task method, hazards and current design information must be understood first."),
  q("PPE and RPE", ["K2", "S2"], "Machining timber will create dust. Which approach gives the best control?", ["Blow dust away with compressed air", "Use effective extraction and the specified face-fit-tested RPE", "Open a door only", "Remove the guard to improve airflow"], 1, "Dust should be controlled at source, with suitable RPE used where the assessment requires it."),
  q("Drawings", ["K8", "S6"], "A drawing dimension conflicts with the specification. What should you do?", ["Choose the larger value", "Stop and obtain clarification through the project procedure", "Split the difference", "Alter the specification"], 1, "Conflicting design information must be clarified before material is cut or fitted."),
  q("Timber", ["K9", "K10"], "Why should timber condition and moisture be considered before use?", ["Only to change its colour", "Movement or decay can affect dimensions, joints and service performance", "It eliminates the need for fixings", "It makes every species interchangeable"], 1, "Moisture movement and defects can change fit, strength, stability and durability."),
  q("Estimating", ["K12", "S7"], "What should a cutting list include?", ["Only finished widths", "Component quantities, sizes and suitable machining or cutting allowances", "The operatives' names", "Only the delivery date"], 1, "A useful cutting list identifies every component and the material allowance needed to produce it."),
  q("Hand tools", ["K15", "S11"], "A chisel edge is damaged. What is the correct response?", ["Use more force", "Maintain it using the correct sharpening method and inspect it before reuse", "Round over the cutting edge", "Cool it in adhesive"], 1, "A correctly maintained edge is safer and produces more accurate work."),
  q("Power tools", ["K17", "S10"], "What should happen before adjusting or changing a blade or cutter?", ["Hold the trigger partly on", "Isolate the tool and follow the manufacturer's procedure", "Remove all guards", "Ask someone else to hold the blade"], 1, "Isolation prevents unintentional start-up during adjustment."),
  q("Jigs", ["K16", "S12"], "What is the main benefit of a well-made jig?", ["It replaces all quality checks", "It helps repeat an operation accurately and consistently", "It makes blunt cutters safe", "It changes timber species"], 1, "A jig locates or guides work so repeat components can be made consistently."),
  q("Communication", ["K13", "S8", "B5"], "Another trade needs access through your work area. What should you do?", ["Ignore them", "Agree a safe sequence and communicate any restrictions", "Leave tools across the route", "Move their equipment without asking"], 1, "Clear coordination supports safe and efficient team working."),
  q("Inclusion", ["K19", "B3"], "Which action supports an inclusive workplace?", ["Excluding a learner from technical discussions", "Using respectful language and giving people a fair chance to contribute", "Sharing jokes after someone asks you to stop", "Making assumptions about ability"], 1, "Respect and fair participation help create an inclusive culture."),
  q("Wellbeing", ["K20", "S13", "B1"], "Where should a worker look for wellbeing support?", ["Only social media", "The employer or site support route and appropriate professional services", "An unqualified rumour", "Nowhere until the job ends"], 1, "Workers should know and use appropriate internal and professional sources of support."),
  q("Sustainability", ["K4", "S3", "B2"], "Which material practice best supports sustainability?", ["Mix all waste together", "Plan cuts, protect reusable material and segregate waste correctly", "Order without checking quantities", "Burn treated timber"], 1, "Efficient cutting, protection, reuse and correct segregation reduce waste and environmental harm."),
];

const siteCarpenter = [
  ...carpentryCommon,
  q("First fix", ["K27", "S14"], "Which item is normally associated with first-fix site carpentry?", ["Door handles after decoration", "Floor joists or structural timber before finishes", "Final paint coating", "Carpet grippers after handover"], 1, "First fix includes structural and concealed carpentry installed before later finishes."),
  q("Structural fixings", ["K22", "S15"], "How should a structural timber fixing be selected?", ["By colour", "To the drawing or specification for the load, substrate and environment", "Using the shortest fixing available", "By reusing any removed fixing"], 1, "Structural fixings must suit the designed load, materials, exposure and installation requirements."),
  q("Timber sizing", ["K23", "S16"], "What should be checked before using a timber sizing table?", ["Only the timber price", "That the table applies to the member, span, loading, spacing and timber grade", "That every value is rounded down", "That the timber is painted"], 1, "Sizing information is valid only when its stated design conditions match the work."),
  q("Pitched roofs", ["K25", "S18"], "What controls the length and angles of a common rafter?", ["The roof span, rise or pitch and the specified overhang/details", "Only the tile colour", "The scaffold width", "The number of operatives"], 0, "Rafter geometry comes from the roof dimensions and specified details."),
  q("Pitched roofs", ["K25", "S18"], "Why must a birdsmouth not be over-cut?", ["It makes painting slower", "It can reduce the effective rafter section and bearing performance", "It increases the roof pitch", "It changes the timber species"], 1, "Excessive notching can weaken the rafter and reduce effective bearing."),
  q("Flat roofs", ["K26"], "Why is the designed fall important on a flat roof?", ["To make joists longer", "To direct water toward the intended outlet and limit ponding", "To replace the weatherproof covering", "To remove the need for ventilation"], 1, "The specified fall helps water drain to the designed outlet."),
  q("Laser levels", ["K29", "S19"], "Before transferring a datum with a laser level, what should be checked?", ["Only the battery colour", "The instrument is suitable, stable and checked for accuracy", "The receiver is hidden", "The datum is estimated"], 1, "A stable, verified instrument is needed before relying on transferred levels."),
  q("Second fix", ["K28", "S17"], "Which task is typically second-fix carpentry?", ["Installing roof trusses", "Fitting skirting, architrave or internal doors", "Excavating foundations", "Casting a concrete slab"], 1, "Second fix generally includes visible finishing carpentry after the main structure and finishes are ready."),
  q("Door linings", ["K21", "S21"], "What should be checked before permanently fixing a door lining?", ["Only the head length", "Plumb, level, square, opening size and allowance for finishes", "Only the hinge colour", "That the jambs are bowed"], 1, "The lining must be correctly positioned and sized so the door and finishes can fit and operate."),
  q("Hinges", ["K21", "S21"], "How should a hinge recess be prepared?", ["Deeper than the leaf", "To the marked position and depth so the leaf sits correctly", "Without checking the hinge size", "With a rounded base regardless of the fitting"], 1, "Accurate position and depth allow the hinge to sit flush and the door to operate correctly."),
  q("Scribing", ["K24", "S22"], "What is the purpose of scribing a timber component?", ["To copy an irregular profile or junction for a close fit", "To increase its moisture content", "To replace every fixing", "To make it deliberately oversize"], 0, "Scribing transfers the shape of an adjoining surface or detail to the component."),
  q("Connections", ["K22", "S20"], "A joist hanger is being installed. Which information takes priority?", ["A photograph from another site", "The design and manufacturer's fixing schedule", "The fewest nails possible", "The operative's preferred pattern"], 1, "Proprietary connectors depend on the specified type, position and full fixing schedule."),
];

const architecturalJoiner = [
  ...carpentryCommon,
  q("Fire doors", ["K30"], "Why must components in a fire-door assembly match the approved specification?", ["Only for appearance", "Substitution can compromise the tested fire and smoke performance", "To make the door heavier", "To avoid fitting hinges"], 1, "Door leaf, frame, seals, glazing and ironmongery form a specified performance assembly."),
  q("Fixed machinery", ["K31", "S30"], "When may a guard on fixed workshop machinery be adjusted?", ["While the cutter is moving", "After isolation, using the correct setting procedure", "Only when another person holds it", "Whenever it blocks the view"], 1, "Isolation and the manufacturer's setting method are required before guard adjustment."),
  q("Fixed machinery", ["K31", "S30"], "What should be done if a machine's extraction is not working effectively?", ["Continue until the end of the batch", "Stop and report the fault using the workshop procedure", "Remove the guard", "Sweep dust into the machine"], 1, "Ineffective extraction can create serious dust hazards and requires corrective action."),
  q("Setting out", ["K32", "S23"], "What is a setting rod used for in architectural joinery?", ["Recording staff attendance", "Setting out full-size component, joint and feature positions", "Testing timber moisture electrically", "Sharpening cutters"], 1, "A setting rod transfers the required sizes and positions consistently to the work."),
  q("Marking out", ["K32", "S23"], "Why are face-side and face-edge marks used?", ["To decorate the component", "To provide consistent reference surfaces for setting out and machining", "To show waste only", "To identify treated timber"], 1, "Common reference faces reduce accumulated marking and machining errors."),
  q("Timber joints", ["K33", "S24"], "What helps matching mortise-and-tenon components assemble accurately?", ["Marking each part from unrelated faces", "Using consistent datums and checking shoulders and fit before assembly", "Making the tenon wider than the mortise", "Rounding every shoulder"], 1, "Consistent reference faces and trial fitting help the joint close squarely and accurately."),
  q("Joinery connections", ["K35", "S25"], "Why is a dry assembly useful before adhesive is applied?", ["It cures the timber", "It checks joint fit, dimensions and squareness while adjustment is still possible", "It replaces clamps", "It removes the need for drawings"], 1, "A dry fit exposes errors before the assembly becomes difficult to correct."),
  q("Timber windows", ["K34", "S26"], "Before gluing a window frame, which check is most useful?", ["Only the longest member", "Joint fit, rebates, overall size and equal diagonals", "Only the preservative colour", "That every component is identical"], 1, "Fit, profile, size and squareness should be verified before final assembly."),
  q("First-fix manufacture", ["K36", "S27"], "A door lining head and jambs are being prepared. What should control their sizes?", ["The nearest stock length", "The drawing or setting rod, joint detail and required finished opening", "The workshop bench width", "The last lining made"], 1, "The product must be set out from its current design and finished-opening requirements."),
  q("Second-fix manufacture", ["K37", "S28"], "What should be checked when a timber door is clamped after assembly?", ["Only adhesive colour", "Overall dimensions, diagonals, joint closure and flatness", "Only one stile length", "That the clamps are all different"], 1, "Dimensional and joint checks confirm the assembly is square, closed and true."),
  q("Ironmongery", ["K39", "S29"], "How should a lock or hinge recess be set out?", ["From the fitting, drawing and consistent product datums", "By guessing the centre", "After finishing the product", "Using only the screw length"], 0, "Accurate datums and the actual fitting requirements control position and depth."),
  q("Finishing", ["K38"], "What is the safest response to a finishing product not listed in the specification?", ["Use it on the whole product", "Check compatibility and obtain approval before use", "Mix it with adhesive", "Apply extra coats to compensate"], 1, "An unapproved finish may react with timber, adhesive, seals or later coatings."),
];

const trowelCommon = [
  q("Site safety", ["102.1.1", "102.1.3"], "What should a worker do with site induction and safety-sign information?", ["Follow it only when supervised", "Understand and follow it throughout the work", "Replace it with personal preference", "Ignore it after the first day"], 1, "Induction information and safety notices remain part of the site's control arrangements."),
  q("Serious danger", ["102.2.1", "102.2.2"], "An uncontrolled hazard presents serious and immediate danger. What is the correct action?", ["Continue carefully", "Stop work, move to safety and report it through the site procedure", "Take a photograph and carry on", "Wait until the next break"], 1, "Work should stop when serious danger is not controlled, and the issue must be reported."),
  q("Manual handling", ["102.2.5"], "What should be considered before moving a heavy masonry component?", ["Only the shortest route", "Load, individual capability, task, environment and suitable assistance", "Whether it can be thrown", "Only the delivery time"], 1, "A handling assessment considers the task, load, person and environment, with aids or help used where needed."),
  q("Emergencies", ["102.1.8", "102.3.8"], "On hearing the evacuation alarm, what should you do?", ["Finish the current course", "Follow the site emergency procedure and go to the designated assembly point", "Collect every personal item", "Use any vehicle to leave"], 1, "The site emergency plan gives the safe route, assembly point and reporting process."),
  q("Work methods", ["303.1.1", "303.1.4"], "What should influence the selected method of work?", ["Only speed", "Project information, resources, conditions and the risk assessment", "Only the cheapest tool", "The previous project's method"], 1, "A suitable method must meet technical requirements while controlling risks and using available resources."),
  q("Clarification", ["303.2.1", "303.2.2"], "The project information is insufficient to choose a safe method. What should happen?", ["Guess the missing detail", "Obtain the necessary information from an authorised source", "Copy a different drawing", "Start and decide later"], 1, "Missing information must be obtained before the method is confirmed."),
  q("Planning", ["300.1.1", "300.1.2"], "What makes a useful personal work sequence?", ["A list based only on preference", "An order based on the work, resources, dependencies and site programme", "Starting every activity at once", "Ignoring other occupations"], 1, "Sequencing should reflect resources, interfaces and the required programme."),
  q("Programme changes", ["300.5.1", "300.5.2"], "A delay will affect the agreed programme. What should you do?", ["Hide it until completion", "Identify the effect and inform the relevant person promptly", "Change another trade's programme yourself", "Reduce quality checks"], 1, "Early reporting allows the programme and interfaces to be managed."),
  q("Low-carbon working", ["300.4.5", "300.4.6"], "Which choice best supports low-carbon working?", ["Over-ordering every material", "Planning quantities and methods to reduce waste and unnecessary plant use", "Sending reusable materials to mixed waste", "Leaving equipment running"], 1, "Efficient resources and methods can reduce waste, transport and energy demand."),
  q("Working relationships", ["502.1.2", "502.1.4"], "Which behaviour supports equality and diversity at work?", ["Withholding information from a new starter", "Communicating respectfully and adapting so relevant people can participate", "Using stereotypes to allocate work", "Ignoring a request for reasonable support"], 1, "Respectful, inclusive communication helps people contribute safely and effectively."),
  q("Coordination", ["502.4.1", "502.4.2"], "Your work will affect another occupation's access. What should you do?", ["Block the route without warning", "Clarify and coordinate the activities with the people involved", "Move their work", "Assume they will notice"], 1, "Interfaces should be agreed so work can proceed safely and efficiently."),
  q("Setting out", ["701.7.1", "701.7.4"], "Which method can help set out a right angle on site?", ["A 3-4-5 triangle checked to suitable dimensions", "Measuring one side only", "Following the nearest wall without checking", "Changing the datum"], 0, "A correctly measured 3-4-5 triangle is a practical right-angle check."),
];

const thinJoint = [
  ...trowelCommon,
  q("Thin-joint system", ["238.1.1", "238.7.4"], "What should control the thin-joint masonry system and joint requirements?", ["The operative's preferred mortar", "The current design, system specification and manufacturer's instructions", "A conventional brickwork detail", "The colour of the blocks"], 1, "Thin-joint work is a proprietary system and must follow its approved design and instructions."),
  q("First course", ["238.7.1", "238.7.3", "238.7.4"], "Why is the first course especially important in thin-joint masonry?", ["It is hidden later", "Its line, level and accuracy establish the base for subsequent thin beds", "It removes the need for later checks", "It uses no setting out"], 1, "A precise first course limits accumulated error through the wall."),
  q("Joint control", ["238.7.1", "238.7.4"], "How should thin-joint bed thickness be controlled?", ["By adding extra adhesive to correct every level error", "By using the specified applicator and system method on accurately prepared units", "By eye with no checks", "By using conventional thick mortar"], 1, "The proprietary method and applicator help maintain the designed thin, consistent bed."),
  q("Quality checks", ["238.7.1", "238.7.3"], "Which checks should continue as thin-joint walling rises?", ["Only the final height", "Line, level, plumb, gauge and key opening dimensions", "Only adhesive colour", "No checks after the first course"], 1, "Regular checks prevent small errors accumulating through thin bed joints."),
  q("Resources", ["238.4.1", "238.4.4"], "A block or adhesive is not approved for the selected thin-joint system. What should you do?", ["Use it in hidden areas", "Stop and obtain a compatible approved resource", "Mix two products together", "Increase the joint thickness"], 1, "System components must be compatible and approved for the specified construction."),
  q("Cutting", ["238.3.2", "238.3.3"], "Cutting thin-joint blocks will create dust. What controls are required?", ["Dry sweep only", "The task-specified dust control, extraction or suppression and suitable RPE", "No controls outdoors", "Remove the tool guard"], 1, "Block dust must be controlled using the assessed engineering and respiratory controls."),
  q("Bond", ["238.7.3", "238.7.4"], "Why should contact surfaces be clean before thin-joint adhesive is applied?", ["To make the block lighter", "Dust or debris can reduce consistent contact and bond", "To change the block size", "To avoid setting out"], 1, "Clean, prepared surfaces support a consistent joint and system bond."),
  q("Openings", ["238.1.1", "238.7.1"], "How should lintels and opening details be formed in thin-joint masonry?", ["Using any detail from conventional masonry", "To the current drawing and system specification", "Without checking bearing", "After the wall is complete"], 1, "Openings must use the designed system components, bearings and details."),
  q("Protection", ["238.5.1", "238.5.4"], "What is the correct response when weather could affect fresh thin-joint work?", ["Ignore the forecast", "Use the specified protection or stop work when conditions are unsuitable", "Add unapproved water", "Cover only the tools"], 1, "Fresh work and materials must be protected within the system's permitted conditions."),
  q("Coordination", ["238.7.5"], "A service opening is needed through the thin-joint wall. What should happen?", ["Cut it wherever it is easiest", "Coordinate it with the design and relevant occupations before forming it", "Wait until finishes are complete", "Remove nearby reinforcement without approval"], 1, "Openings can affect structure and interfaces, so their position and method must be agreed."),
  q("Quantities", ["238.4.7"], "What should a thin-joint material calculation include?", ["Only wall length", "Wall area or volume, openings, unit coverage and the specified waste allowance", "Only adhesive colour", "A full spare load regardless of need"], 1, "Dimensions, openings, product coverage and justified waste produce a useful quantity."),
  q("Unsuitable resources", ["238.1.3", "238.4.3"], "Delivered blocks are damaged beyond the permitted quality. What should you do?", ["Hide them in the wall", "Segregate and report them, then obtain suitable replacements", "Increase the adhesive thickness", "Paint them"], 1, "Unsuitable resources should not be built in; they must be reported and resolved."),
];

const repair = [
  ...trowelCommon,
  q("Diagnosis", ["690.1.1", "690.7.4"], "What should be established before a masonry repair method is selected?", ["Only the visible colour", "The defect, likely cause, extent and specified repair outcome", "The fastest demolition method", "Only the age of the building"], 1, "Treating the cause and extent is essential to a durable, appropriate repair."),
  q("Compatibility", ["690.4.1", "690.4.2"], "Why should replacement masonry and mortar be compatible with the existing work?", ["Only to reduce price", "Incompatible strength, movement or moisture behaviour can cause further damage", "To make every repair invisible", "To avoid curing"], 1, "Repair materials should work physically and visually with the retained construction."),
  q("Protection", ["690.5.1", "690.5.2"], "Before removing a damaged unit, what should be protected?", ["Only the new unit", "Retained masonry, adjacent finishes, people and the surrounding area", "Nothing if the unit is small", "Only the tools"], 1, "Controlled protection prevents the repair operation causing additional damage or risk."),
  q("Stability", ["690.2.1", "690.7.4"], "A proposed repair may affect structural stability. What should happen?", ["Remove more masonry for access", "Stop and obtain the specified temporary support or authorised advice", "Work faster", "Rely on the mortar above"], 1, "Stability must be maintained through an approved sequence and support arrangement."),
  q("Controlled removal", ["690.7.2", "690.7.3"], "What is the aim when cutting out defective masonry?", ["To enlarge the opening as much as possible", "To remove the specified material while minimising damage to sound work", "To break every adjoining joint", "To reuse damaged units automatically"], 1, "Careful cutting preserves retained material and the intended repair dimensions."),
  q("Repointing", ["690.7.4"], "How should a joint be prepared for repointing?", ["Smear new mortar over the surface", "Remove defective material to the specified sound depth and clean the joint", "Fill it with dry dust", "Seal it before raking out"], 1, "A clean, adequately prepared joint provides space and a sound background for new mortar."),
  q("Background preparation", ["690.4.3", "690.7.4"], "What should control whether a repair background is dampened before mortar is placed?", ["Personal habit", "The repair specification, material condition and environmental conditions", "The wall colour", "The number of operatives"], 1, "Preparation must suit the selected repair materials and site conditions."),
  q("Mortar selection", ["690.4.1", "690.4.4"], "Which mortar should be used for a masonry repair?", ["The strongest available", "The compatible mix stated in the repair specification", "Any leftover mix", "Pure cement in every case"], 1, "An overly strong or incompatible mortar can damage retained masonry."),
  q("Curing", ["690.5.1", "690.5.4"], "Why must a completed repair be protected during curing?", ["To make it dry instantly", "To control damaging moisture loss, rain, frost or impact as specified", "To avoid all inspections", "To increase joint thickness"], 1, "Correct protection allows the repair material to develop as intended."),
  q("Escalation", ["690.1.3", "690.7.4"], "Cracking continues beyond the area shown for repair. What should you do?", ["Fill only the visible end", "Stop and report the changed condition for reassessment", "Cover it with paint", "Remove the entire wall"], 1, "A changed defect pattern may indicate a different cause or scope and needs authorised review."),
  q("Records", ["690.1.3", "690.7.5"], "Why should unexpected concealed defects be recorded and reported?", ["To delay the job", "They may change the repair method, resources, safety or programme", "Only to increase material use", "They never affect the work"], 1, "Clear records support an informed decision and coordination with relevant people."),
  q("Tools", ["690.7.6"], "What should happen to repair tools after use?", ["Leave mortar to harden on them", "Clean, inspect, maintain and store them using the correct procedure", "Store them wet", "Discard every tool"], 1, "Maintenance keeps tools safe, serviceable and capable of accurate work."),
];

const specialist = [
  ...trowelCommon,
  q("Design information", ["828.1.1", "828.7.4"], "What should control the installation of a proprietary masonry support angle?", ["A detail from any project", "The approved design and manufacturer's system instructions", "The easiest anchor spacing", "The brick colour"], 1, "Support systems must match their engineered design, approved fixings and installation tolerances."),
  q("Substrate", ["828.1.3", "828.4.3"], "The substrate differs from the support-system design. What should you do?", ["Use longer fixings without approval", "Stop and obtain authorised clarification", "Drill extra holes at random", "Reduce the number of anchors"], 1, "A changed substrate can alter fixing capacity and requires design review."),
  q("Setting out", ["828.7.1", "828.7.3"], "What should be established before fixing a specialist masonry element?", ["Only its delivery weight", "The correct datum, line, level, position and interfaces", "The nearest mortar joint", "The scaffold colour"], 1, "Accurate setting out is essential for structural and envelope interfaces."),
  q("Fire barriers", ["828.7.4"], "Why must cavity fire barriers remain continuous at joints and interfaces?", ["To support wet mortar", "Gaps can compromise the intended fire and smoke performance", "To replace wall ties", "To improve paint adhesion"], 1, "The installed barrier must preserve the specified continuity of fire performance."),
  q("Wind posts", ["828.7.1", "828.7.4"], "How should a wind post be positioned?", ["Where it is least visible", "To the approved line, level, fixing and connection details", "Touching every service", "Without checking the base connection"], 1, "Wind posts are structural elements and must match the engineered location and connections."),
  q("Starter systems", ["828.4.1", "828.7.4"], "Which components should be used in a proprietary masonry starter system?", ["Any similar-looking strip and ties", "The specified compatible system components and fixings", "Second-hand fixings of unknown grade", "Only mortar"], 1, "System performance depends on compatible, approved components installed as designed."),
  q("Coordination", ["828.7.5"], "A support angle clashes with another trade's service. What should happen?", ["Cut the angle", "Stop and coordinate an authorised resolution with the relevant people", "Move the service yourself", "Omit the nearest fixing"], 1, "Structural or fire-performance components must not be altered without approval."),
  q("Substitution", ["828.4.1", "828.4.4"], "A specified specialist fixing is unavailable. What is the correct response?", ["Use a smaller fixing", "Seek an approved equivalent through the project procedure", "Reduce the spacing", "Leave the connection loose"], 1, "Substitution requires confirmation that performance, substrate and exposure requirements are met."),
  q("Handling", ["828.2.1", "828.4.5"], "A specialist masonry element is heavy and awkward. What should be planned?", ["A single-person lift", "A suitable lifting method, access and control of the load", "Throwing it onto the scaffold", "Removing lifting points"], 1, "Handling should be assessed and suitable mechanical or team assistance used."),
  q("Protection", ["828.5.1", "828.5.4"], "How should exposed finished specialist masonry be protected?", ["With any material that traps staining moisture", "Using the specified non-damaging protection while allowing required curing and drainage", "By covering fixings before inspection", "By washing it with acid"], 1, "Protection must prevent damage without creating staining, trapped moisture or hidden defects."),
  q("Fixing verification", ["828.7.1", "828.7.3"], "A fixing requires a stated installation torque. What should be used?", ["An uncalibrated guess", "The specified verified method and suitable calibrated equipment where required", "The longest lever available", "A hammer only"], 1, "Specified fixing installation values must be achieved and verified using suitable equipment."),
  q("Inspection", ["828.7.1", "828.7.5"], "Why should specialist elements be checked before they are concealed?", ["Only for photographs", "Fixings, continuity and interfaces may no longer be accessible later", "To avoid recording the work", "Because finishes correct all defects"], 1, "Inspection before concealment allows critical components and interfaces to be verified."),
];

const drainage = [
  ...trowelCommon,
  q("Setting out", ["837.1.1", "837.7.1"], "What should control a drainage run's line, level and fall?", ["The trench shape alone", "The approved drainage design and specified datum", "The nearest fence", "The pipe colour"], 1, "The design establishes where the system runs and how it drains."),
  q("Excavations", ["837.2.1", "837.3.2"], "Before entering or working beside a drainage trench, what must be confirmed?", ["Only that the pipe has arrived", "The excavation controls, access and ground conditions are safe", "That the trench is narrow", "That spoil is at the edge"], 1, "Excavation collapse, access, services and plant movement require effective controls."),
  q("Bedding", ["837.7.1", "837.7.2"], "Why is correctly prepared bedding important below a drainage pipe?", ["It changes pipe diameter", "It provides continuous support and helps maintain line and fall", "It replaces joints", "It prevents all testing"], 1, "Uniform support reduces point loading and keeps the pipe at its designed alignment."),
  q("Manufacturer instructions", ["837.4.2", "837.7.5"], "How should pipe sockets, seals and lubricant be assembled?", ["Using any oil available", "To the pipe-system manufacturer's instructions", "With the seal removed", "By hammering the socket"], 1, "Correct seals, cleanliness, lubricant and insertion method are needed for a sound joint."),
  q("Cleanliness", ["837.5.2", "837.7.2"], "Why should open drainage pipe ends be capped during installation?", ["To increase the fall", "To prevent debris entering and obstructing or damaging the system", "To replace testing", "To make the pipe heavier"], 1, "Temporary caps keep soil, mortar and other debris out of the system."),
  q("Flexible joints", ["837.7.2", "837.7.5"], "Why is an insertion-depth mark useful on a push-fit drainage joint?", ["It marks the pipe colour", "It shows whether the pipe has been inserted to the required position", "It replaces the seal", "It identifies the trench depth"], 1, "A clear witness mark helps verify correct joint assembly."),
  q("Access", ["837.1.1", "837.7.1"], "Where should rodding or inspection access be provided?", ["Only where it is hidden", "At the locations required by the design so the system can be inspected and cleared", "At every pipe midpoint", "After backfilling"], 1, "Designed access points allow maintenance at changes and other required locations."),
  q("Backfilling", ["837.7.1", "837.7.2"], "What is most important during initial backfill around a pipe?", ["Tip large rubble directly onto it", "Use the specified material and placement method without disturbing line, fall or joints", "Remove side support", "Compact with any plant on the pipe"], 1, "Correct surround and controlled placement protect the pipe and preserve its alignment."),
  q("Testing", ["837.7.6"], "When should a new drainage run be tested and checked?", ["Only after it is inaccessible", "At the specified stage before concealment or backfill prevents inspection", "Before joints are made", "Testing is never needed"], 1, "Testing while the work is accessible allows faults to be located and corrected."),
  q("Test failure", ["837.1.3", "837.7.6"], "A drainage test fails. What should happen next?", ["Backfill immediately", "Keep the work accessible, identify and rectify the cause, then retest", "Increase the test limit", "Ignore a small loss"], 1, "A failed system must be investigated, corrected and shown to comply before it is covered."),
  q("Connections", ["837.1.1", "837.7.5"], "How should foul and surface-water connections be identified?", ["By pipe colour alone", "From the approved drainage information and verified connection points", "By choosing the nearest manhole", "By smell"], 1, "Misconnections can cause pollution or flooding, so destinations must be confirmed from approved information."),
  q("Quantities", ["837.4.6"], "What should a drainage quantity take-off include?", ["Only straight pipe length", "Pipe lengths, fittings, access components, bedding or surround and a justified allowance", "Only the number of trenches", "A fixed percentage unrelated to the design"], 1, "The take-off must reflect all designed components and an appropriate, justified allowance."),
];

const definitions = [
  { enrolmentId: "ST0095", courseTitle: "Bricklayer", qualificationId: "ST0095", pathwayId: null, file: "ST0095-v1.json", questions: bricklayer },
  { enrolmentId: "ST0264-SITE", courseTitle: "Site Carpenter", qualificationId: "ST0264", pathwayId: "site-carpenter", file: "ST0264-SITE-v1.json", questions: siteCarpenter },
  { enrolmentId: "ST0264-AJ", courseTitle: "Architectural Joiner", qualificationId: "ST0264", pathwayId: "architectural-joiner", file: "ST0264-AJ-v1.json", questions: architecturalJoiner },
  { enrolmentId: "6570-05-THIN", courseTitle: "Thin Joint", qualificationId: "6570-05", pathwayId: "thin", file: "6570-05-THIN-v1.json", questions: thinJoint },
  { enrolmentId: "6570-05-REPAIR", courseTitle: "Repair & Maintenance", qualificationId: "6570-05", pathwayId: "repair", file: "6570-05-REPAIR-v1.json", questions: repair },
  { enrolmentId: "6570-05-SPECIALIST", courseTitle: "Specialist Masonry", qualificationId: "6570-05", pathwayId: "specialist", file: "6570-05-SPECIALIST-v1.json", questions: specialist },
  { enrolmentId: "6570-05-DRAINAGE", courseTitle: "Drainage", qualificationId: "6570-05", pathwayId: "drainage", file: "6570-05-DRAINAGE-v1.json", questions: drainage },
];

const packs = {
  ST0095: JSON.parse(await readFile(path.join(root, "course-packs/Bricklayer_ST0095_v1.2.nisi"), "utf8")),
  ST0264: JSON.parse(await readFile(path.join(root, "course-packs/Carpentry_Joinery_ST0264_v1.4.nisi"), "utf8")),
  "6570-05": JSON.parse(await readFile(path.join(root, "course-packs/Trowel_Occupations_6570-05_v1.nisi"), "utf8")),
};

function allowedCodes(definition) {
  const pack = packs[definition.qualificationId];
  if (!definition.pathwayId) return new Set(pack.codes.map(String));
  const pathway = pack.pathways.find((item) => item.id === definition.pathwayId);
  if (!pathway) throw new Error(`${definition.enrolmentId} pathway is missing from its course pack.`);
  return new Set(pathway.codes.map(String));
}

function makeBank(definition) {
  const allowed = allowedCodes(definition);
  const ids = new Set();
  const questions = definition.questions.map((question, index) => {
    const id = `${definition.enrolmentId}-Q${String(index + 1).padStart(3, "0")}`;
    if (ids.has(id)) throw new Error(`Duplicate question ID ${id}.`);
    ids.add(id);
    if (question.options.length !== 4) throw new Error(`${id} must have four options.`);
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error(`${id} has an invalid correct answer.`);
    }
    if (!question.mapsTo.length || question.mapsTo.some((code) => !allowed.has(String(code)))) {
      throw new Error(`${id} maps outside ${definition.enrolmentId}: ${question.mapsTo.join(", ")}.`);
    }
    return { id, ...question };
  });
  if (questions.length !== 24) {
    throw new Error(`${definition.enrolmentId} must contain 24 questions, found ${questions.length}.`);
  }
  return {
    eviaQuestionBank: 1,
    schemaVersion: 1,
    bankVersion: "1.0",
    updated,
    enrolmentId: definition.enrolmentId,
    courseTitle: definition.courseTitle,
    qualificationId: definition.qualificationId,
    pathwayId: definition.pathwayId,
    assessmentArea: "ARP",
    questionType: "multiple-choice",
    questionsPerMock: 10,
    sourceNote: "Original Evia practice questions mapped to course criteria. These are not official awarding-body or end-point-assessment questions.",
    questions,
  };
}

await mkdir(outputDirectory, { recursive: true });
const banks = definitions.map((definition) => ({ definition, bank: makeBank(definition) }));
await Promise.all(
  banks.map(({ definition, bank }) =>
    writeFile(path.join(outputDirectory, definition.file), `${JSON.stringify(bank, null, 2)}\n`),
  ),
);

const index = {
  eviaQuestionBankIndex: 1,
  schemaVersion: 1,
  updated,
  totalQuestions: banks.reduce((sum, { bank }) => sum + bank.questions.length, 0),
  banks: banks.map(({ definition, bank }) => ({
    enrolmentId: definition.enrolmentId,
    courseTitle: definition.courseTitle,
    qualificationId: definition.qualificationId,
    pathwayId: definition.pathwayId,
    path: definition.file,
    questionCount: bank.questions.length,
    questionsPerMock: bank.questionsPerMock,
  })),
};
await writeFile(path.join(outputDirectory, "index-v1.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`Built ${banks.length} ARP question banks with ${index.totalQuestions} mapped questions.`);
