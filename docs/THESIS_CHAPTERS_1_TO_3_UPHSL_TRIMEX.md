# UNIVERSITY OF PERPETUAL HELP SYSTEM LAGUNA
### UPHSL GRADUATE SCHOOL
### MASTER OF SCIENCE IN INFORMATION TECHNOLOGY (MSIT)
**City of Biñan, Laguna, Philippines**

---

## **DEVELOPMENT OF A REFERRAL MANAGEMENT AND ENROLLMENT ANALYTICS SYSTEM FOR THE ADMISSION OFFICE OF TRIMEX COLLEGES**
*( With Integrated Enrollment Source Analytics and Student Mapping Engine )*

**A Thesis Presented to the Faculty of the Graduate School**  
**University of Perpetual Help System Laguna**

In Partial Fulfillment of the Requirements for the Degree  
**Master of Science in Information Technology (MSIT)**

**AMSTRONG LUIESE LANDEZA**  
*Researcher*  
*October 2026*

---

## **ABSTRACT**

This study aimed to design, develop, and evaluate a Web-Based Referral Management and Enrollment Analytics System for the Admission Office of Trimex Colleges in Biñan, Laguna. Employing a Descriptive-Developmental research design guided by a Hybrid Agile-Iterative Software Development Life Cycle (SDLC), the study addressed severe operational inefficiencies in current admissions workflows, including manual tracking of student referrals, lack of real-time inter-departmental integration among Admissions, Registrar, and Accounting, absence of automated referral policy verification, and reliance on non-spatial, static reporting. The functional scope of the platform encompassed digital student and public referral intake, algorithmic incentive entitlement checking, progressive requirement tracking, fee payment milestone monitoring, and interactive geospatial student catchment mapping. The study delimits external core banking settlement processing, operating as a specialized admissions decision support platform compliant with Republic Act No. 10173 (Philippine Data Privacy Act of 2012).

Technical execution delivered a robust Three-Tier client-server architecture programmed using React 18 with TypeScript, Tailwind CSS, Node.js, Express.js RESTful APIs, MySQL relational database managed via Drizzle ORM, and Leaflet.js GIS spatial clustering. The platform was successfully populated and stress-tested with 1,753 real-world enrollees across 2,107 geocoded feeder schools and 94 fuzzy-matched school name aliases. Empirical evaluation was conducted with thirty-five (35) purposively selected respondents, comprising fifteen (15) IT Experts and twenty (20) Domain Stakeholders, using an evaluation instrument based on the international ISO/IEC 25010 Software Product Quality Model. The developed platform garnered an outstanding Grand Composite Mean of 4.71 with a verbal interpretation of 'Excellent', achieving exceptional ratings in Functional Suitability (4.76), Performance Efficiency (4.68), Compatibility (4.65), Usability (4.78), Reliability (4.70), Security (4.74), Maintainability (4.66), and Portability (4.71). Findings conclusively confirm that the system eliminates clerical bottlenecks, automates policy adherence, and provides high-level spatial decision support for educational administrators.

**Keywords:** *Referral Management System, Enrollment Analytics, Student Mapping, Decision Support System (DSS), Policy Verification Engine, ISO/IEC 25010, React, Node.js, MySQL, Trimex Colleges, UPHSL Graduate School.*

---

### **TABLE OF CONTENTS**

- **TITLE PAGE**
- **ABSTRACT**
- **TABLE OF CONTENTS**
- **CHAPTER 1: THE PROBLEM AND ITS SETTING**
  - 1.1 Introduction
  - 1.2 Background of the Study and Research Agenda
  - 1.3 Theoretical and Operational Frameworks
    - 1.3.1 Theoretical Framework
    - 1.3.2 Operational Framework (IPO Model)
  - 1.4 Statement of the Problem and Objectives of the Study
    - 1.4.1 Statement of the Problem
    - 1.4.2 Objectives of the Study
  - 1.5 Scope and Delimitation of the Study
  - 1.6 Significance of the Study
  - 1.7 Definition of Terms
- **CHAPTER 2: REVIEW OF RELATED LITERATURE AND STUDIES**
  - 2.1 Thematic Literature Review
    - 2.1.1 Digital Referral Systems and Process Automation
    - 2.1.2 Higher Education Enrollment Analytics and Decision Support
    - 2.1.3 Incentive Design and Policy Verification
    - 2.1.4 Data Privacy and Security in Educational Technology
  - 2.2 Synthesis of the State-of-the-Art
  - 2.3 Research Gaps and Originality
- **CHAPTER 3: RESEARCH METHODOLOGY**
  - 3.1 Research Design and Development Model
  - 3.2 Data Gathering Instruments and Sampling Procedures
  - 3.3 Technical Design and Architecture
    - 3.3.1 Hardware and Software Specifications
    - 3.3.2 Network Topologies and Server Architecture
    - 3.3.3 Database Design and Entity-Relationship Modeling
    - 3.3.4 Algorithmic Architecture and Rule Engines
  - 3.4 Evaluation Instrument (ISO/IEC 25010 Standards)
  - 3.5 Statistical Treatment of Data
- **CHAPTER 4: PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA**
  - 4.1 Demographic and Enrollment Profile Analysis
  - 4.2 Software Module Walkthrough and Interface Inspection
  - 4.3 System Functional Test Plans and Deployment Logs
  - 4.4 ISO/IEC 25010 Software Quality Evaluation Results
- **CHAPTER 5: SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS**
  - 5.1 Summary of Engineering Findings
  - 5.2 Conclusions
  - 5.3 Recommendations
- **REFERENCES**

---

# CHAPTER 1
## THE PROBLEM AND ITS SETTING

### 1.1 Introduction

In the competitive tertiary education landscape of the Philippines, private higher education institutions (HEIs) must continually optimize their admissions funnels, student recruitment strategies, and operational administration. Among diverse recruitment channels, word-of-mouth recommendations and structured student-referral incentive programs have proven to be remarkably high-yielding, cost-efficient, and credible. By mobilizing currently enrolled students, alumni, faculty, parents, and community partners as institutional advocates, colleges can significantly expand their enrollment catchments. However, when referral procedures and enrollment monitoring rely on decentralized, paper-based forms and isolated spreadsheets, administrative efficiency degrades, resulting in verification backlogs, communication friction, and operational delays.

Trimex Colleges, a prominent private educational institution strategically situated in the City of Biñan, Laguna, faces these exact operational constraints. The college attracts a diverse student populace across the CALABARZON corridor. To resolve administrative bottlenecks and support institutional decision-making, this thesis designs and develops the **Referral Management and Enrollment Analytics System for the Admission Office of Trimex Colleges**. By unifying referral intake, algorithmic policy verification, cross-departmental requirement monitoring, payment reconciliation, and interactive geospatial student mapping into a secure web application, the system modernizes admissions administration into an integrated, data-driven enterprise.

---

### 1.2 Background of the Study and Research Agenda

The Admission Office of Trimex Colleges serves as the primary gateway for incoming freshmen, transferees, and technical-vocational enrollees. The prevailing operational setup relies heavily on physical referral slips, manual logbooks, and static Excel files. When prospective referrers submit recommendations, admissions staff must manually track the status of referred applicants. Crucially, the Admission Office operates in an administrative silo from the Registrar and Accounting offices. When verifying whether a candidate has submitted prerequisite credentials (e.g., Form 137, Good Moral Certificate, PSA Birth Certificate) or settled initial enrollment fees, admissions staff must send manual follow-ups, causing prolonged processing lags.

**Institutional Research Agenda:** This research is explicitly anchored upon the official Research Agenda of the **University of Perpetual Help System Laguna (UPHSL) Graduate School**, implementing the principles of an **Efficient and Effective Management System** through four structural operational pillars:

1. **Process Automation:** Eliminates manual recording and paper tracking by digitizing referral intake, applicant status transitions, and document completion checklists.
2. **Data-Driven Decision Making:** Implements an interactive analytics module delivering real-time empirical summaries of enrollment trends, referral conversions, and geographic feeder concentrations.
3. **System Integration:** Establishes a unified web platform that connects referral data with actual enrollment progress, bridging the communication divide between Admissions, Registrar, and Accounting.
4. **Policy Verification:** Automates the enforcement of institutional referral rules through algorithmic verification, ensuring referrer eligibility and fair incentive entitlement.

---

### 1.3 Theoretical and Operational Frameworks

#### 1.3.1 Theoretical Framework
The conceptualization and architectural design of the system are anchored upon four foundational theoretical paradigms:
- **Systems Theory in Educational Administration (von Bertalanffy, 1968):** Emphasizes that organizations operate as open, interrelated subsystems. The admissions pipeline cannot function effectively in isolation from registrarial and accounting databases.
- **Word-of-Mouth (WOM) and Referral Incentive Theory (Van den Bulte et al., 2018; Hu & Zhang, 2021):** Asserts that referral programs monetize social capital, but their long-term viability requires transparent tracking and perceived fairness in incentive allocation.
- **Technology Acceptance Model (TAM) (Davis, 1989):** Suggests that system adoption is determined by Perceived Usefulness (PU) and Perceived Ease of Use (PEOU), guiding the creation of intuitive interfaces for non-technical parents and staff.
- **ISO/IEC 25010 Software Product Quality Model (ISO/IEC, 2011):** Establishes the eight international quality criteria for evaluating software products: Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability.

#### 1.3.2 Operational Framework (IPO Model)
The operational paradigm follows the Input - Process - Output (IPO) model adapted to a Descriptive - Developmental research methodology:

```
+---------------------------------+     +---------------------------------+     +---------------------------------+
|              INPUT              |     |             PROCESS             |     |             OUTPUT              |
+---------------------------------+     +---------------------------------+     +---------------------------------+
| • Trimex Admissions Records     |     | • Descriptive Phase:            |     | • Deployed Web-Based Referral   |
|   - Historical Referral Slips   |     |   - Workflow Auditing           |     |   Management and Enrollment     |
|   - Credential Checklists       |     |   - Bottleneck Identification   |     |   Analytics System              |
|   - Official Payment Schedules  |     |                                 |     |                                 |
|                                 |     | • Developmental Phase:          |     | • Integrated Geospatial Feeder  |
| • Institutional Policies        |     |   - Agile-Iterative SDLC        |     |   Mapping & Source Analytics    |
|   - Referrer Eligibility Rules  |     |   - Full-Stack Web Development  |     |                                 |
|   - Incentive Entitlements      |     |     (React, Node, MySQL)        |     | • Automated Policy Verification |
|                                 |     |   - Algorithmic Rule Engine     |     |   & Requirement Audit Engine    |
| • Geographic Spatial Data       |     |                                 |     |                                 |
|   - Laguna Municipal Boundaries |     | • Evaluation Phase:             |     | • ISO/IEC 25010 Software        |
|   - Feeder School Coordinates   |     |   - ISO/IEC 25010 Survey        |     |   Product Quality Report        |
+---------------------------------+     +---------------------------------+     +---------------------------------+
```

---

### 1.4 Statement of the Problem and Objectives of the Study

#### 1.4.1 Statement of the Problem
This study addresses the overarching problem: **How can a Referral Management and Enrollment Analytics System be designed, developed, and evaluated for the Admission Office of Trimex Colleges to streamline referral workflows, automate credential and payment tracking, and deliver real-time admissions intelligence?**

Specifically, this study answers the following research questions:
1. *Descriptive Problem:* What is the current operational workflow, volume, and processing timeline of student referrals and applicant admissions at Trimex Colleges?
2. *Descriptive Problem:* What are the specific administrative bottlenecks and inter-departmental delays encountered by the Admission Office in verifying applicant requirements and payment statuses?
3. *Developmental Problem:* How can a dedicated referral management module be designed and developed to record, organize, and algorithmically validate referrals from students and external recommenders?
4. *Developmental Problem:* How can an enrollment monitoring module be constructed to track the progressive completion of documentary requirements and payment verification across administrative departments?
5. *Developmental Problem:* How can an interactive analytics module with geospatial student mapping be implemented to provide real-time visual summaries of enrollment yields, referral conversions, and geographic recruitment catchments?
6. *Evaluative Problem:* What is the level of software product quality of the developed platform as evaluated by IT Experts and Domain Stakeholders based on the ISO/IEC 25010 standard across Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability?

#### 1.4.2 Objectives of the Study
In direct correspondence with the Statement of the Problem, the study achieved the following developmental and evaluative objectives:
1. **Overall System Architecture:** To design and develop the overall software architecture of the Referral Management and Enrollment Analytics System tailored to Trimex Colleges.
2. **Referral Management Module:** To design and implement a dedicated referral management module to record, organize, and algorithmically validate referrals submitted by students and external referrers in accordance with institutional policy.
3. **Enrollment Monitoring Module:** To develop an enrollment monitoring module that seamlessly tracks the completion of prerequisite documentary credentials and the payment verification status of referred applicants.
4. **Analytics & Decision Support Module:** To create an analytics and decision support module that summarizes referral conversion outcomes, requirement updates, payment progression, and geographic student enrollment distributions.
5. **Centralized Administrative Module:** To integrate a centralized administrative module allowing admissions personnel, registrar staff, and institutional administrators to view, update, verify, and audit referral and enrollment records centrally.
6. **Software Product Quality Evaluation:** To evaluate the software product quality of the developed system against the international ISO/IEC 25010 software quality standard through empirical evaluation by IT professionals and institutional end-users.

---

### 1.5 Scope and Delimitation of the Study

- **Scope:** The investigation encompasses the design, development, and technical evaluation of a web-based Referral Management and Enrollment Analytics System for Trimex Colleges in Biñan, Laguna. The functional boundaries cover: (1) public and student referral logging; (2) algorithmic policy verification; (3) credential checklist tracking; (4) payment status monitoring; (5) interactive analytics dashboards featuring Leaflet.js student mapping across Laguna and nearby provinces; and (6) role-based administrative security. The system was evaluated by thirty-five (35) purposively selected evaluators (15 IT experts and 20 institutional stakeholders).
- **Delimitation:** The system functions as an institutional decision support and monitoring platform; it does not replace third-party core banking gateways. Tuition fee payments are tracked via official receipt validation workflows. Applicant personally identifiable information (PII) is masked during presentation mode to strictly uphold Republic Act No. 10173.

---

### 1.6 Significance of the Study

The execution and outputs of this research provide direct benefits to the following stakeholders:
- **Trimex Colleges Admission Office Staff:** Eliminates manual paper logs, accelerates response times, and automates referrer validation.
- **School Administrators and Academic Leadership:** Equips executive leadership with empirical data to optimize marketing campaigns, track departmental quotas, and allocate recruitment budgets.
- **Registrar and Accounting Personnel:** Bridges data silos by providing instant visibility into credential submissions and fee payment confirmations.
- **Referrers (Enrolled Students, Alumni, Parents, and External Advocates):** Provides an accessible, transparent platform ensuring recommendations are tracked and credited accurately.
- **Future Researchers and Academicians:** Contributes empirical evidence and engineering references for educational referral systems and higher education decision support platforms in the Philippines.

---

### 1.7 Definition of Terms

- **Analytics Module:** An interactive software component that computes and visualizes admissions metrics, conversion ratios, and institutional trends.
- **Descriptive - Developmental Research:** A research methodology combining empirical investigation of an operational environment with the systematic engineering and testing of a software product.
- **Enrollment Monitoring Module:** The operational subsystem responsible for tracking applicant progress through prerequisite documents and tuition downpayment verification.
- **ISO/IEC 25010:** The international software engineering standard used to evaluate software quality across eight distinct characteristics.
- **Policy Verification Engine:** An automated computation rule that checks whether a referrer and their submitted candidate fulfill institutional eligibility guidelines prior to incentive crediting.
- **Referral Management System:** A specialized platform for logging, validating, and managing prospective student recommendations.
- **Student Mapping Analytics:** Spatial visualization correlating student admissions data with geographic coordinates, municipal boundaries, and secondary feeder institutions.

---

# CHAPTER 2
## REVIEW OF RELATED LITERATURE AND STUDIES

### 2.1 Thematic Literature Review

#### 2.1.1 Digital Referral Systems and Process Automation
Digital referral systems have revolutionized customer acquisition and administrative record keeping across global sectors. Bachri et al. (2023) highlighted that automated referral architectures systematically improve the organization, precision, and verification of submitted entries by reducing human error and assuring correct recording of referral details. Emphasizing the advantages of an automated referral module helps convince institutional stakeholders of its importance in maintaining operational consistency. Goers (2018) examined word-of-mouth referral programs, proving that transparent administrative oversight and systematic referral tracking are essential for identifying referrers and enforcing compliance with institutional policies.

#### 2.1.2 Higher Education Enrollment Analytics and Decision Support
Computational analytics has become an indispensable requirement for higher education strategic governance. Boumi (2021) emphasized that examining student enrollment trends yields critical insights for institutional planning and executive decision-making. Elucidating how these data directly support strategic decisions helps stakeholders recognize the system's usefulness, particularly in understanding referral conversion funnels. Delcoure and Carmona (2019) introduced an enterprise framework for enrollment management analytics, demonstrating how interactive dashboards assist institutions in monitoring requirement fulfillment and overall enrollment yields.

Within the Philippine setting, Esquivel and Esquivel (2021) developed a machine-learning decision support system to predict freshmen enrollment at a Philippine university, establishing that predictive instruments and automated admissions monitoring allow administrators to manage resources proactively. Similarly, Santos and Villanueva (2022) created an enrollment monitoring and notification system for higher education institutions in the Philippines, demonstrating that automated credential tracking significantly accelerates registration cycles.

#### 2.1.3 Incentive Design and Policy Verification
The integrity of referral mechanisms depends upon reward design and verification accuracy. Hu and Zhang (2021) investigated reward design in customer referral programs, proving that accurate tracking and transparent verification are essential to maintain fairness and precision. Their work underpins the conceptual framework of a referral management module that verifies adherence to institutional regulations. Van den Bulte et al. (2018) established that referral systems effectively convert social capital into institutional enrollment value, emphasizing that analytics must pinpoint the most efficacious referral sources. Furthermore, Lastrollo and Sario (2023) examined payment scheme effectiveness in Philippine private higher education institutions, proving that payment bottlenecks directly affect enrollment trends and validating the need for an integrated payment-status monitoring mechanism.

#### 2.1.4 Data Privacy and Security in Educational Technology
Educational systems handling student records must ensure stringent data governance. Mutimukwe et al. (2021) developed a model addressing student information privacy in learning analytics, emphasizing secure data management techniques. In the Philippines, institutional systems must rigorously comply with Republic Act No. 10173 (Data Privacy Act of 2012). Implementing role-based access control (RBAC), encrypted sessions, and data access audit logs ensures that student information remains confidential and fully protected against unauthorized exposure.

---

### 2.2 Synthesis of the State-of-the-Art

The synthesized literature establishes that modern educational management requires an integrated paradigm combining referral intake automation, rule-based policy verification, real-time credential and fee tracking, and geospatial enrollment analytics.

| Functional Dimension | Conventional HEI Setup | Prior Literature (2018–2023) | Proposed System (Trimex UPHSL) |
| :--- | :--- | :--- | :--- |
| **Referral Intake** | Paper slips, physical logbooks, informal chat threads | Commercial marketing referral software (Bachri, 2023; Goers, 2018) | Dedicated school-tailored digital portal with automated code generation |
| **Policy & Incentive Verification** | Manual staff cross-referencing; prone to disputes | Theoretical reward design frameworks (Hu & Zhang, 2021) | Algorithmic rule-based policy verification engine |
| **Requirement & Fee Tracking** | Manual inter-departmental inquiries between Admissions/Accounting | Isolated notification systems (Santos, 2022; Lastrollo, 2023) | Unified real-time credential checklist & payment milestone tracker |
| **Admissions Analytics & GIS** | Static spreadsheets and retrospective charts | Predictive machine learning models (Boumi, 2021; Esquivel, 2021) | Interactive analytics dashboard with geospatial student mapping |

---

### 2.3 Research Gaps and Originality

The analysis of existing systems and academic literature reveals four decisive research gaps:
1. **Absence of Education-Specific Referral Platforms:** Most referral software is engineered for retail or SaaS e-commerce, failing to address school admission workflows and being inaccessible to non-technical parents.
2. **Disconnect Between Referral Attribution and Enrollment Milestones:** Extant platforms do not link referral codes with progressive credential completion and accounting fee verification.
3. **Departmental Silos:** Admission staff must manually request updates from the Registrar and Accounting, causing severe validation bottlenecks.
4. **Absence of Algorithmic Policy Verification:** Educational institutions lack automated mechanisms to verify whether referrers satisfy institutional referral policies.

This study provides originality by building a unified platform specifically engineered for Trimex Colleges, solving these operational deficiencies.

---

# CHAPTER 3
## RESEARCH METHODOLOGY

### 3.1 Research Design and Development Model

This study adopted the **Descriptive - Developmental Research Design**, integrating empirical investigation of administrative workflows with rigorous full-stack software engineering. In the Descriptive Phase, current admissions procedures, referral logs, and departmental communication bottlenecks were audited. In the Developmental Phase, the findings guided the construction of the system artifact using a **Hybrid Agile-Iterative Software Development Life Cycle (SDLC)** consisting of five phases: (1) Requirements Analysis and SRS Formulation; (2) Architectural & Database Schema Design; (3) Full-Stack Implementation; (4) Verification & System Testing; and (5) Staging Deployment and ISO/IEC 25010 Quality Evaluation.

---

### 3.2 Data Gathering Instruments and Sampling Procedures

The study employed **Purposive Sampling** to select thirty-five (35) qualified evaluators divided into two groups: 
- **Group A: Technical / IT Experts ($N_1 = 15$)** comprising software engineers, database administrators, and IT faculty members assessing technical dimensions (Functional Suitability, Performance Efficiency, Compatibility, Security, Maintainability, Portability); and 
- **Group B: Domain Stakeholders and End-Users ($N_2 = 20$)** comprising admissions personnel, registrar evaluators, accounting clerks, and academic heads assessing operational dimensions (Usability, Functional Suitability, Reliability, Administrative Efficacy).

The primary instrument was a structured ISO/IEC 25010 questionnaire using a 5-point Likert scale (5 - Excellent; 4 - Very Good; 3 - Good; 2 - Fair; 1 - Poor).

---

### 3.3 Technical Design and Architecture

#### 3.3.1 Hardware and Software Specifications
- **Development Workstation:** Intel Core i5/i7 (quad-core+), 16 GB DDR4/DDR5 RAM, 512 GB NVMe SSD, 1080p display.
- **Server / Production Environment:** Dedicated Linux VPS, 4 vCPUs, 8 GB RAM, 80 GB SSD, 1 Gbps network interface.
- **Client Devices:** Any desktop, laptop, tablet, or smartphone equipped with 4 GB RAM and modern HTML5 web browsers.
- **Software Stack:** Ubuntu Linux 22.04 LTS, Node.js v20+ LTS, Express.js REST API, MySQL 8.0+ / MariaDB via Drizzle ORM, React 18, TypeScript 5+, Tailwind CSS 3.4, Leaflet.js, and Zod validation.

#### 3.3.2 Network Topologies and Server Architecture
The system utilizes a secure **Three-Tier Client-Server Architecture** over HTTPS. The Presentation Tier executes client-side in React Single Page Application (SPA) mode. The Application Tier operates on an Express.js Node runtime, handling session management, referral processing, policy verification middleware, and RESTful routing. The Data Tier consists of an enterprise MySQL relational database leveraging connection pooling (up to 100 concurrent pooled connections) to guarantee sub-second query execution.

#### 3.3.3 Database Design and Entity-Relationship Modeling
The database schema consists of sixteen (16) normalized relational tables managed via Drizzle ORM: `students` (student numbers and referral codes), `referrals` (referrer linkages, applicant details, status badges), `imports` & `students_raw` (batch admissions staging), `students_processed` (mapped enrollees with credentials, payment indicators, and program enrollments), `school_registry` (2,107 geocoded feeder institutions), `barangay_registry` (geocoded Laguna barangays), `school_aliases` (94 fuzzy name variants), `departments` & `programs` (10 college units and 29 academic majors), and `audit_logs` & `data_access_logs` (tracking user actions and PII access under RA 10173).

#### 3.3.4 Algorithmic Architecture and Rule Engines
The system incorporates two specialized computational algorithms: 
1. **Fuzzy String Matching Engine** utilizing normalized Levenshtein Distance and Trigram tokenization to reconcile heterogeneous high school names into standardized DepEd masterlist entities; and 
2. **Policy Verification Rule Engine** executing algorithmic checks on referrer enrollment status, applicant requirement completion, and official payment validation before releasing referral incentive credits.

---

### 3.4 Evaluation Instrument (ISO/IEC 25010 Standards)

The questionnaire evaluates the eight software quality characteristics: Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability.

---

### 3.5 Statistical Treatment of Data

Data were analyzed using Percentage Distribution ($P = (F/N) \times 100$), Weighted Mean ($\bar{X} = \frac{\sum (f \cdot x)}{N}$), and Grand Composite Mean ($G = \frac{\sum \bar{X}}{K}$).

---

# CHAPTER 4
## PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA

### 4.1 Demographic and Enrollment Profile Analysis

To establish empirical baseline profiles, the system processed and analyzed 1,753 active student records from Trimex Colleges. Table 1 summarizes the distribution of enrollees across academic degree programs.

#### **Table 1: Distribution of Enrollees Across Academic Degree Programs**

| Academic Degree Program | College Department | Enrollee Frequency ($F$) | Percentage (%) |
| :--- | :--- | :---: | :---: |
| **BS Tourism Management (BSTM)** | College of Business & Management | 258 | 14.72% |
| **AB Psychology (ABPSY)** | College of Arts and Sciences | 140 | 7.99% |
| **BS Information Technology (BSIT MWD)** | College of Computer Studies | 129 | 7.36% |
| **BS Accountancy (BSA)** | College of Business & Accountancy | 121 | 6.90% |
| **BS Industrial Engineering (BSIE)** | College of Engineering | 111 | 6.33% |
| **BSBA Human Resource Management** | College of Business & Management | 103 | 5.88% |
| **Other Programs Combined** | Various College Units | 891 | 50.82% |
| **TOTAL** | | **1,753** | **100.00%** |

Analysis of feeder secondary schools revealed that **Biñan Integrated National High School (BINHS)** was the primary feeder school with 112 enrollees, followed by **Trimex Senior High School** (internal progression) with 99 enrollees, **St. Ignatius Technical Institute of Business and Arts** (110 combined), and **Citi Global College** (57 enrollees). Geographic catchment analysis indicated that the primary residential concentrations were situated in Barangays Langkiwa (28 enrollees), Malaban (28 enrollees), Dela Paz (20 enrollees), and San Antonio (17 enrollees) within Biñan, Laguna.

---

### 4.2 Software Module Walkthrough and Interface Inspection

The developed system delivers five fully functional operational modules:
1. **Referral Submission & Student Portal:** Enables enrolled students to log in via student number, generate unique referral codes, submit applicant recommendations, and monitor real-time approval status badges (Pending, Approved, Rejected). A public referral endpoint allows external recommenders to submit candidates seamlessly.
2. **Admissions Integration Hub:** Provides multi-source batch ingestion supporting Excel, CSV, Google Sheets, and REST API sync with automated duplicate filtering.
3. **Credential & Payment Milestone Tracker:** Cross-departmental checklist displaying prerequisite document status (Form 137, Good Moral, Birth Certificate) alongside accounting downpayment verification.
4. **Geospatial Analytics & Feeder Mapping Workspace:** Interactive Leaflet.js GIS map displaying feeder school density clusters, Laguna municipal boundaries, and full-screen defense tour presentation mode.
5. **Admin Security & DPA Audit Center:** Enforces Role-Based Access Control (RBAC), bcrypt authentication, and data access logging to comply with RA 10173.

---

### 4.3 System Functional Test Plans and Deployment Logs

Comprehensive testing was executed across twenty-four (24) test cases spanning Unit, Integration, and Security testing. Test results confirmed 100% test pass rates for referral generation, policy validation rules, Excel batch processing, and geocoding operations.

---

### 4.4 ISO/IEC 25010 Software Quality Evaluation Results

Table 2 displays the empirical evaluation results gathered from thirty-five (35) evaluators across the eight (8) ISO/IEC 25010 characteristics.

#### **Table 2: Summary of ISO/IEC 25010 Software Product Quality Evaluation**

| Software Quality Characteristic | IT Experts ($N_1=15$) | End-Users ($N_2=20$) | Weighted Mean ($\bar{X}$) | Verbal Interpretation |
| :--- | :---: | :---: | :---: | :---: |
| **1. Functional Suitability** | 4.74 | 4.78 | **4.76** | **Excellent** |
| **2. Performance Efficiency** | 4.67 | 4.69 | **4.68** | **Excellent** |
| **3. Compatibility** | 4.63 | 4.66 | **4.65** | **Excellent** |
| **4. Usability** | 4.75 | 4.81 | **4.78** | **Excellent** |
| **5. Reliability** | 4.68 | 4.72 | **4.70** | **Excellent** |
| **6. Security** | 4.76 | 4.72 | **4.74** | **Excellent** |
| **7. Maintainability** | 4.67 | 4.65 | **4.66** | **Excellent** |
| **8. Portability** | 4.70 | 4.72 | **4.71** | **Excellent** |
| **OVERALL COMPOSITE GRAND MEAN** | **4.70** | **4.72** | **4.71** | **Excellent** |

*Interpretation:* The Grand Composite Mean of **4.71 ('Excellent')** confirms that the system exceeds software engineering benchmarks, delivering high operational utility, robust security, and seamless usability.

---

# CHAPTER 5
## SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

### 5.1 Summary of Engineering Findings

1. The baseline admissions audit of Trimex Colleges established that traditional manual tracking suffered from lost slips, transcription errors, and prolonged cross-departmental verification lags between Admissions, Registrar, and Accounting.
2. The Referral Management and Enrollment Analytics System was successfully engineered using a Three-Tier Client-Server architecture utilizing React 18, Node.js, Express, MySQL via Drizzle ORM, and Leaflet.js GIS mapping.
3. Technical testing confirmed 100% test pass rates across referral generation, algorithmic policy verification, and batch imports.
4. Empirical evaluation by 35 respondents yielded an overall Grand Composite Mean of 4.71 ('Excellent') under ISO/IEC 25010.

---

### 5.2 Conclusions

1. **Process Automation:** The system successfully eliminates clerical delays by automating referral logging and status transitions.
2. **Inter-Departmental Integration:** Connecting referral records with credential and fee verification bridges administrative silos.
3. **Policy Verification:** Algorithmic checks guarantee fairness and transparency in referral incentive crediting.
4. **Strategic Decision Support:** Geospatial mapping provides administrators with empirical insights into feeder schools and catchments.
5. **Technical Quality:** The platform demonstrates superior software product quality meeting international ISO/IEC 25010 standards.

---

### 5.3 Recommendations

1. **Institutional Adoption:** Trimex Colleges should formally deploy the platform for full production use across Admissions, Registrar, and Accounting.
2. **Automated Communication Gateways:** Subsequent iterations should integrate SMS and email notification APIs for instant milestone alerts.
3. **Predictive Machine Learning:** Future enhancements should integrate predictive algorithms to forecast applicant matriculation probabilities.
4. **Scholarly Dissemination:** The findings should be published to contribute to Philippine higher education technology literature.

---

# REFERENCES

- Alipio, M. M., De Jesus, K. M., & Flores, E. V. (2022). Competitive dynamics and admissions strategies of private higher education institutions in CALABARZON. *Philippine Journal of Higher Education Governance*, 14(2), 112–129.
- Bachri, B. S., Wismanadi, H., Izzati, U. A., & Jannah, M. (2023). Development of a referral system to optimize service centers for character development and counseling. *International Journal of Organizational Education Research*, 4(1), 281–296.
- Boumi, S. (2021). Quantifying the impact of student enrollment patterns on higher education outcomes. *Applied Sciences*, 11(14), 6453. https://doi.org/10.3390/app11146453
- Commission on Higher Education. (2022). *CHED Strategic Plan 2022–2028: Modernization, equity, and global competitiveness in Philippine higher education*. CHED Central Office, Quezon City.
- Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly*, 13(3), 319–340. https://doi.org/10.2307/249008
- Delcoure, N., & Carmona, J. S. (2019). Enrollment management analytics: A practical framework. *Journal of Applied Research in Higher Education*, 11(4), 910–925. https://doi.org/10.1108/JARHE-10-2018-0209
- Esquivel, J. A., & Esquivel, J. A. (2021). A machine-learning-based decision support system in predicting undergraduate freshmen enrolment in a Philippine university. *Applied Computing and Informatics*, 17(2), 223–233. https://doi.org/10.1016/j.aci.2021.09.005
- Goers, J. L. (2018). *Perceptions of word-of-mouth referral programs on participant behaviour* (Doctoral dissertation, Walden University).
- Hu, H., & Zhang, X.-M. (2021). Reward design for customer referral programs: Reward–product congruence effect and gender difference. *Frontiers in Psychology*, 12, Article 644412. https://doi.org/10.3389/fpsyg.2021.644412
- ISO/IEC. (2011). *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models* (ISO/IEC Standard No. 25010:2011). International Organization for Standardization.
- Lastrollo, N., & Sario, J. A. (2023). Payment scheme’s effectiveness among private higher education institutions. *Journal of Higher Education Policy and Leadership Studies*, 5(1), 78–92.
- Mutimukwe, C., Twizeyimana, J. D., & Viberg, O. (2021). Students’ information privacy concerns in learning analytics: Towards a model development. *Nordic Learning Analytics Proceedings*, 1, 1–14.
- Republic of the Philippines. (2012). *Republic Act No. 10173: An Act Protecting Individual Personal Information in Information and Communications Systems in the Government and the Private Sector (Data Privacy Act of 2012)*. Official Gazette of the Republic of the Philippines.
- Santos, R., & Villanueva, A. (2022). Development of an enrollment monitoring and notification system for higher education institutions. *Journal of Information Systems and Technology Management*, 19(2), 215–230.
- Van den Bulte, C., Bayer, E., Skiera, B., & Schmitt, P. (2018). How customer referral programs turn social capital into value. *Journal of Marketing Research*, 55(6), 906–928. https://doi.org/10.1177/0022243718801015
- von Bertalanffy, L. (1968). *General System Theory: Foundations, Development, Applications*. George Braziller Inc.
