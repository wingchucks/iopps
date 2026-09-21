import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAdpCleanupProvider} from '../src/lib/server/hermes-job-cleanup-provider.ts';
import {CleanupConflict, type CleanupEvidence} from '../src/lib/server/hermes-job-cleanup.ts';

// Exact public response payloads captured 2026-09-21, embedded for offline portability.
// Capture envelope metadata is NOT supplied to the provider as status evidence.
const captures = [
  {
    "id": "0i8MEndHFvaXOcsY8m82",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201063079768_1",
    "active": true,
    "payload": {
      "itemID": "9201063079768_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Harm Reduction Outreach Worker",
      "postDate": "2025-05-15T14:37:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Casual"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2025-05-15T14:37Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "516551",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Operations",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1380",
      "requisitionDescription": "<div><div><div><div><link href=\"https://static.workforcenow.adp.com/mas/mdf-components/24.32.25/styles/froala_editor.pkgd.min.css\" rel=\"stylesheet\" type=\"text/css\">&nbsp;<link href=\"https://static.workforcenow.adp.com/mas/mdf-components/24.32.25/styles/froala_style.min.css\" rel=\"stylesheet\" type=\"text/css\"><div class=\"fr-view\"><p id=\"isPasted\"><strong>Position Summary:&nbsp;</strong><strong>&nbsp;</strong></p><p>The Harm Reduction Worker is responsible for engaging, supporting, educating, advocating, and referring adult individuals, with various mental and health problems, substance use disorders, various addictions, communicable diseases, and stressors such as grief, loss, poverty, and homelessness to internal and external services. As part of a multi-disciplinary team and utilizing a variety of outreach and educational approaches, the Harm Reduction Worker will support individuals to remain engaged in addressing their own health status through connection to a continuum of care. &nbsp;This position also supports and advances various harm reduction strategies.&nbsp;</p><p><strong>Responsibilities:</strong>&nbsp;</p><ul><li>Engage individuals with mental and health problems, substance use disorders, addictions, communicable diseases, and stressors such as grief, loss, poverty, and homelessness to internal and external services.</li><li>Advocate on behalf of individual clients and their families;</li><li>Utilizes a variety of outreach and educational approaches to engage with and support the individuals accessing services;&nbsp;</li><li>Facilitate exchange and distribution of harm reduction supplies;&nbsp;</li><li>Maintains control of the harm reduction area that receives a large volume of clients participating in the harm reduction program;&nbsp;</li><li>Conduct outreach activities to homes, shelters, and a variety of other settings;&nbsp;</li><li>Work with individuals to build relationships and ensure they are connected with local support services;</li><li>Provide information and help navigate services and opportunities available to clients within the community;&nbsp;</li><li>Provide updated information and education with regards to safe health practices, harm reduction, life skills, conflict resolution, drugs, prostitution, gangs, and community resources;</li><li>Act as an advocate for clients;</li><li>Maintain a high level of confidentiality standards;</li><li>Assisting with forms and services such as ID assistance, housing, and other forms and applications as needed;</li><li>Transportation to supports and services;</li><li>Promotes cultural considerations with clients as appropriate, link client with cultural events, Elders, smudging, etc.;&nbsp;</li><li>Demonstrates behaviours and attitude that align with STC Strategic priorities and values as a place that is judgment-free, accepting, compassionate and empathetic regardless of race, nationality, or economic standing;&nbsp;</li><li>Work collaboratively with other Health Centre team members on program development and evaluation and aid in facilitating client care plans;&nbsp;</li><li>Maintain accurate records and documentation in accordance with evaluation and funding agreement standards;</li><li>Attend and participate in project staff meetings;&nbsp;</li><li>Participate in STC Accreditation and maintain best practices and quality improvement;&nbsp;</li><li>Adhere to STC policies and procedures;&nbsp;</li><li>Perform other related duties as defined and assigned by the reporting Director or designate on an as and when required basis.&nbsp;</li></ul><p><strong>Working Environment:&nbsp;</strong></p><ul><li>Services provided in a community setting which may present many unknown variables;&nbsp;</li><li>Exposure to clients who may have impaired judgment due to emotional distress, mental illness, withdrawal, or intoxication;&nbsp;</li><li>Flexible hours. Weekend, evening, or holiday work may be required.&nbsp;</li></ul><p><strong>Education and Experience:&nbsp;</strong></p><ul><li>Completed grade 12 or equivalent;</li><li>Two (2) years of related experience in an outreach capacity;&nbsp;</li><li>Experience working effectively with culturally, economically, and socially diverse clients;</li><li>Expertise in working with individuals living with mental health problems and substance use disorders;&nbsp;</li></ul><p><strong>Knowledge, Skills, and/or Abilities:</strong></p><ul><li>Demonstrate empathy, compassion, and strong communication skills;</li><li>Demonstrated success in connecting with vulnerable populations;&nbsp;</li><li>Demonstrated proficiency in Microsoft Excel, Word, Outlook, and PowerPoint with an ability to easily learn new software applications;</li><li>Knowledgeable of resources within the community;</li><li>Understanding of harm reduction strategies and trauma-informed care;&nbsp;</li><li>Ability to work independently and as a member of an interdisciplinary team;</li><li>Must demonstrate appropriate communication during difficult, high stress and/or emotional situations;&nbsp;</li><li>Highly self-motivated, energetic, organized, and detail-oriented with an attitude for continuous improvement;&nbsp;</li><li>Ability to work independently with demonstrated organizational and time management skills;&nbsp;</li><li>Must demonstrate appropriate communication during difficult, high stress and/or emotional situations;&nbsp;</li><li>Sensitivity towards cultural differences with particular emphasis on First Nations and Metis People.&nbsp;</li><li>Ability to provide compassionate, respectful, non-judgmental, and culturally competent care to the vulnerable population.</li><li>Ability to deal with disruptive behaviour and manage crises.</li><li>Ability to plan and organize assigned duties.</li><li>Ability to establish positive working relationships with a multi-disciplinary team, clients, and service providers.</li><li>Ability to problem-solve and apply sound judgment.</li><li>Highly self-motivated, energetic, organized, and detail-oriented with an attitude for continuous improvement.</li><li>High flexibility with strong interpersonal skills that allow one to work effectively in a diverse environment.</li><li>Knowledge of the political, social, and economic objectives of the Saskatoon Tribal Council and of the Dakota, Cree, and Saulteaux cultures will be considered an asset.&nbsp;</li></ul><p><strong>Other:&nbsp;</strong></p><ul><li>Must provide a current, original, Canadian Criminal Record Check (CCRC) with vulnerable sector search as a condition of employment; and</li><li>Must possess a valid Saskatchewan driver&rsquo;s license, a reliable vehicle, and meet STC&rsquo;s insurance requirements.</li></ul></div></div></div></div></div>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "1nekmP9eqMWXIJ6JrXgk",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201068721627_1",
    "active": true,
    "payload": {
      "itemID": "9201068721627_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Well-Being Services ChildYouth Support Worker",
      "postDate": "2025-06-16T16:30:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2025-06-16T16:30Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "517371",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Client Services",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1398",
      "requisitionDescription": "<p id=\"isPasted\">Position Summary: &nbsp;</p><p>STC Well-being Services Emergency receiving home is committed to provide child/youth care rooted in indigenous culture and values, controlled and managed to provide care, support and protection services. The Child/Youth Support Worker is responsible to provide care to children and youth aged 0-12 yrs. who are no longer in the care of their primary caregivers and are involved with Saskatoon Tribal Council, Well-being Services (STC WBS). The Child/Youth Support Worker will ensure the physical, emotional, psychological, cultural and daily essential needs are met. In addition, demonstrating warmth, empathy, compassion, and displaying genuine passion for working with children and youth. The Child/Youth Support Worker will work collaboratively with the WBS Home Supervisor and STC WBS to provide planning, advocacy and resources to children and youth that may require supports in areas of trauma, health, mental health, growth and development. &nbsp;&nbsp;</p><p>The Child/Youth Support Worker is under the direct supervision of and will report directly to the Well-being Services Home Supervisor and overseen by the Well-being Services Director. The Child/Youth Support Worker will follow the Saskatoon Tribal Council Personnel and Financial Policies and the STC Homes Operations and Program Guidelines Manual.&nbsp;</p><p>Responsibilities:&nbsp;</p><p>Direct Services &nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Ensure the best interests of children and youth is foremost in all duties and actions.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Assist Well-being Services Home Supervisor in assessing and implementing the mental, emotional, physical and cultural </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">well being</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> of children</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> and youth. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Provide a positive, safe and compassionate environment of care and shelter.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Respond to and provide advocacy, support and resources to children and youth that may require extra attention </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">with</span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">regard to</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">trauma, health, mental health, </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">growth</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> and development</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Demonstrate professionalism, effective communication and interpersonal skills in your practice.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Maintain professional and ethical boundaries.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Follow a strict code of confidentiality at all times</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Represent STC in a positive manner at all times</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Ensure safety for </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">child care</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> is maintained</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">. </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Report any suspected abuse to supervisor as per Duty to Report policy and processes.&nbsp;</span></span></li></ul><p>&nbsp;</p><p>Daily Tasks &nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Assist the Well-being Services Home Supervisor to complete and adhere to the documentation and reporting as required in performing duties as per the STC Personnel and Financial Policy along with the Operation and Program Guidelines Manuals;&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Ensure the children and youth basic needs are met for shelter, food, clothing and emotional support;&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Will be responsible for the daily functions and daily organization of the home operations pertaining to </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">child care</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> and home requirements including</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> but not limited to</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">; meal preparations, household/yard management,</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">transportation to school, appointments, recreation activities;</span></span></li><li>Re<span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">sponsible to listen, support, validate and document all interaction with each child </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">on a daily basis</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Plan and deliver daily programming and activities for the children and youth with a focus on growth and development, cultural inclusion and as outlined by the case plan.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Ensure the STC emergency receiving home and vehicles are maintained as outlined in Operation and Program Guidelines Manuals and as directed by the Supervisor.&nbsp;</span></span></li></ul><p>&nbsp;</p><p>Working Environment: &nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">The STC Emergency Receiving Home operate on a 24 hour, 7 days a week basis.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Child/Youth Support Workers are scheduled to work unconventional hours and rotational shifts and flexibility in shift coverage in all STC Home as directed by Well-being Services Home Supervisor and or designate of authority.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Positions in the </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">child care</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> field</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> can be both mentally and emotionally challenging. The nature of the positions may expose incumbents to </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">high levels</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> of tension when dealing with issues. The tension includes a level of stress that is usually moderate with </span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">high levels</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> occurring on occasions. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Work in an environment which offers emergency care to children and youth with various physical, emotional and psychological care and crisis management.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Given the traditional practices of the Dakota, Cree, Dene and Saulteaux cultures, from time to time there can be exposure to wood smoke and the burning of sacred medicines, including tobacco, sweet grass, sage or cedar, may occur within the work setting.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Possible exposure to communicable diseases and infections including but not limited to; impetigo, bed bugs, Covid-19, common colds.</span></span></li><li>Readily available to provide essential care to residents under various conditions.</li></ul><p>&nbsp;</p><p>Physical Demands: &nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Freedom of movement physically fit individual who </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\">are able to</span><span class=\"NormalTextRun SCXW197703775 BCX8\"> get down on the floor to play with and ability to </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\">lift up</span><span class=\"NormalTextRun SCXW197703775 BCX8\"> to 50 lbs. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Lifting &amp; transport of materials required for program delivery</span></span></li></ul><p>&nbsp;</p><p>Health and Safety: &nbsp;</p><p>Rights: All Saskatoon Tribal Council employees have the right to information on potential hazards in the workplace, the right to participate in Occupational Health and Safety decisions, use personal protective equipment and clothing as directed by the employer and the right to refuse dangerous work.&nbsp;</p><p>&nbsp;</p><p>Responsibilities: All employees must co-operate with the Occupational Health and Safety (OH&amp;S) Committee; remain alert to changes or events that might affect client or employee safety; report safety issues, accidents or injuries immediately; follow safe work practices, including the use of PPE; and use their training and knowledge to help other employees work safely as well. &nbsp;</p><p>&nbsp;</p><p>Education and Experience&nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Certificate/ Diploma or Degree in Early Childhood Education or&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Other education in a related Human Services Field with child/youth care experience.</span></span></li><li><span data-contrast=\"none\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">First Aid and CPR certification. &nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">ASSIST &ndash; Suicide Prevention Training &ndash; Considered an asset</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Mental Health First Aide and/or other types of Therapeutic </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Crisis</span><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\"> intervention and/or Behaviour management training is recommended.</span></span></li></ul><p>&nbsp;</p><p>Knowledge Skills and Abilities&nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Knowledge of traditional First Nations holistic model of health and wellness.&nbsp;</span></span>&nbsp;</li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Ability to build healthy relationships with children, youth and staff.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Demonstrated exceptional leadership, administrative and problem-solving skills.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Must have excellent written and interpersonal communication skills.</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Knowledge of child development milestones;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Ability to teach Children/Youth Life Skills is also considered an asset</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Ability to communicate with children and </span><span class=\"NormalTextRun AdvancedProofingIssueV2Themed SCXW197703775 BCX8\">having an understanding of</span><span class=\"NormalTextRun SCXW197703775 BCX8\"> children in care with knowledge of First Nations children in care.</span></span></li><li><span data-contrast=\"none\" lang=\"EN-US\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Possess an understanding of Inherent and Treaty Rights, traditions, culture, language and history and ability to provide service from a holistic family systems framework of practice that honors and respects First Nations governance, authority and aspirations;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Knowledge of community services, urban services and resources;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Knowledge of </span></span><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">the Saskatchewan Child and Family Services Act;</span></span></li><li><span data-contrast=\"none\" lang=\"EN-US\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Has an understanding and/or knowledge of the Youth Justice System &ndash; Youth probation knowledge and Court proceedings </span><span class=\"NormalTextRun ContextualSpellingAndGrammarErrorV2Themed SCXW197703775 BCX8\">in</span><span class=\"NormalTextRun SCXW197703775 BCX8\"> an asset. </span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Flexible and adaptable to fast pace and changing environment.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Ability to demonstrate knowledge of basic computer programs and administrative computer skills; &nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\">Work independently and in a team atmosphere;</span></span></li></ul><p>Other &nbsp;</p><ul><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Must possess a valid Saskatchewan driver&rsquo;s license (class 5) and meet STC&rsquo;s insurance requirements.&nbsp;</span></span></li><li><span data-contrast=\"auto\" lang=\"EN-CA\" class=\"TextRun SCXW197703775 BCX8\"><span class=\"NormalTextRun SCXW197703775 BCX8\" data-ccp-parastyle=\"No Spacing\">Must provide a current, original, Canadian Criminal Record Check (CPIC) with vulnerable sector search as a condition of employment.</span></span></li></ul>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "2j392LWYj5Rn2xP36BKT",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9200999664641_1",
    "active": true,
    "payload": {
      "itemID": "9200999664641_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Saweyihtotan Peacekeeper",
      "postDate": "2024-07-23T14:22:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Casual"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2024-07-23T14:22Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "502496",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Client Services",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1269",
      "requisitionDescription": "<div><p id=\"isPasted\"><strong>Position Summary</strong></p><p>Saweyihtotan Supportive Family Housing is a new addition to the current Saweyihtotan program which currently provides transitional housing, outreach and support to homeless and vulnerable community members.&nbsp;The role of the Peacekeeper is to provide and maintain a safe and supportive environment in a short-term residential setting that is both culturally open and accessible to vulnerable populations.&nbsp;The Peacekeepers will be responsible for the safety of those workers delivering direct supports to participants with complex and multiple needs ensuring that all community members are receiving the best services within and outside of the facility.&nbsp;The Peacekeeper will report directly to the Saweyihtotan Program Coordinator or designate and will follow the Saskatoon Tribal Council Personnel and Financial Policies.&nbsp;</p><p><strong>Responsibilities</strong></p><ul><li>Security of the building and facilities;</li><li>Monitor all individuals entering the facility;</li><li>Provide active listening to the clients accessing the program for possible referral for further assistance;</li><li>Report and write incidents as they occur;</li><li>Ensure the building and property is maintained;</li><li>Assist Saweyihtotan Support Workers in operational tasks to ensure that all procedures are being followed;</li><li>Patrol premises to prevent and detect signs of intrusion and ensure security of doors, windows, and gates;</li><li>Report and write daily logs;</li><li>Call police or fire departments in cases of emergency, such as fire or presence of unauthorized persons;</li><li>Other duties as assigned.</li></ul><p><strong>Education &amp; Experience</strong></p><ul><li>Minimum one year in security;</li><li>First Aid and CPR &ndash; C certification;</li></ul><p><strong>Knowledge, Skills &amp; Abilities</strong></p><ul><li>Knowledge of Saskatoon Inner City;</li><li>Knowledge of Indigenous traditions and culture;</li><li>Basic knowledge of computer applications;&nbsp;</li><li>Excellent communication and written skills;</li><li>Punctual and reliable;</li><li>Knowledge of the political, social and economic objectives of the Saskatoon Tribal Council and of the Dakota, Cree, and Saulteaux cultures will be considered an asset.</li></ul><p><strong>Other Work Conditions:</strong></p><ul><li>Willingness to work rotational shifts, facility operates 24 hours a day/ 7 days per week.</li><li>Must possess a valid Saskatchewan driver&rsquo;s license and meet STC&rsquo;s insurance requirements;&nbsp;</li><li>Must provide a current, original, Canadian Criminal Record Check (CPIC) with vulnerable sector search as a condition of employment.</li></ul></div>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "70zbVfpvg7mxpXdCFKPn",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201056577037_1",
    "active": true,
    "payload": {
      "itemID": "9201056577037_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Family Services Worker",
      "postDate": "2025-04-08T11:32:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Full-Time Term"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2025-04-08T11:32Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "515692",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1364",
      "requisitionDescription": "<div><div><link href=\"https://static.workforcenow.adp.com/mas/mdf-components/25.10.27/styles/froala_editor.pkgd.min.css\" rel=\"stylesheet\" type=\"text/css\"><link href=\"https://static.workforcenow.adp.com/mas/mdf-components/25.10.27/styles/froala_style.min.css\" rel=\"stylesheet\" type=\"text/css\"><div class=\"fr-view\"><p id=\"isPasted\"><strong>The Position</strong></p><p>Reporting to the Child and Family Services Supervisor, the Family Services Worker provides case management services to families in our member nation communities. Regular travel 2-3 times a week to communities outside of Saskatoon is required. The Family Services Worker provides support to the families to prevent children being apprehended/or to avoid children being apprehended. &nbsp;You are an advocate for family and children needs to promote family security, stabilization and quality of life. This position also provide after-hours &ldquo;on-call&rsquo; support on a rotational schedule. &nbsp;A Post-Secondary degree in Social Work from an accredited post-secondary institution is required.</p><p><strong>&nbsp;</strong><strong>Responsibilities</strong></p><ul type=\"disc\"><li>Work cooperatively with the STC Child Protection Investigators and the Well-being Services team in accordance with policy and legislation to ensure the safety of children;</li><li>Interview child, family, extended family and persons of sufficient interest (can include elders, community members, school officials, neighbours, etc.);</li><li>Case plan with clients to develop a plan that provides reunification of children with family;</li><li>Conduct mandatory risk assessment of all factors related to the child&rsquo;s environment, family&rsquo;s individual&rsquo;s environment including factors associated with the safety and protection of the child, and services for the child&rsquo;s parents, and family service needs of extended family members;</li><li>Maintain, monitor, evaluate and record client progress;</li><li>Refer clients to appropriate community resources and prevention services to assist with mitigating child protection concerns or improving quality life for children and families;</li><li>Plan and coordinate ways for families to connect with support services in a timely manner;&nbsp;</li><li>Update and maintain documentation and reporting on a monthly basis to ensure compliance standards;</li><li>Acquire working knowledge of all programs and services available through STC and at the First Nation communities in order to facilitate referrals or request for services.&nbsp;</li><li>Participate in planning and development at the First Nations community level to improve community-based programs, supports and services;</li><li>Deliver programs and workshops that promote holistic family care and child-well-being;</li><li>Support clients with problem solving, conflict resolution, and goal planning;</li><li>Advocate for family and children needs to promote family security, stabilization and quality of life;</li><li>Provide after-hours &ldquo;on-call&rsquo; support on a rotational schedule;&nbsp;</li><li>Perform other related duties as defined and assigned by the reporting Director or designate on an as and when required basis.&nbsp;</li></ul><p><strong>Education and Experience</strong></p><ul type=\"disc\"><li><strong>Post-Secondary degree in Social Work from an accredited post-secondary institution;</strong></li><li>Two (2) years in a child and family services position specifically related to child welfare and protection services</li><li>Demonstrated knowledge in the area of child protection and family support services and community development processes.</li><li>Must be eligible or member in good standing of Saskatchewan Association of Social Workers (SASW)</li><li>Experience working within a governance structure in a community development capacity with First Nations; familiarity with First Nations culture, history is considered an asset.</li></ul><p><strong>Knowledge Skills and Abilities<br></strong></p><ul type=\"disc\"><li>Demonstrated ability in risk and family assessment and crisis intervention procedures;</li><li>Ability to facilitate quality assurance measures for case management, case planning and file documentation;</li><li>Ability to provide documentation and completion of assessments and case plans of families required;</li><li>Demonstrated ability in child protection, children in-care services and &lsquo;protocols&rsquo; with related agencies;</li><li>Working knowledge of the Saskatchewan Child and Family Services Act;</li><li>Ability to apply and interpret provincial/federal policy for children in care;</li><li>Knowledge of indicators and effects of child abuse and the family dynamics that contribute to abuse;</li><li>Ability to work with vulnerable families dealing with trauma</li><li>Effective time management, problem solving, and decision making;</li><li>Ability to work in a calm, confident and empathetic manner, to coordinate and facilitate discussion with various viewpoints in determining the best interest of the child;</li><li>Demonstrated skill and proficiency using computer applications to enter and retrieve data, access information, and produce and edit a variety of correspondence, documents and reports;&nbsp;</li><li>Ability to work individually or as a team and prioritize workload;</li><li>Excellent verbal and written communication skills, including the ability to establish and maintain effective working relationships.</li><li>Maintain integrity by keeping sensitive information confidential and adheres to STC&rsquo;s policies</li><li>Previous experience working with a First Nations organization will be considered an asset</li><li>Possess an understanding of Inherent and Treaty Rights, traditions, culture, language and history and ability to provide service from a holistic family systems framework of practice that honors and respects First Nations governance, authority and aspirations;<strong>&nbsp;</strong></li></ul><p><strong>Other Conditions</strong></p><ul type=\"disc\"><li>Must possess a valid Saskatchewan driver&rsquo;s license, a reliable vehicle and meet STC&rsquo;s insurance requirements;</li><li>Must provide a current, original, Canadian Criminal Record Check (CPIC) with vulnerable sector search as a condition of employment;&nbsp;</li><li>Must be willing to work flexible hours, evenings and weekends, and to perform other related duties as required or assigned.&nbsp;</li></ul></div></div></div>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "b8B0MjhhK58CoClyEWiO",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201066466375_1",
    "active": true,
    "payload": {
      "itemID": "9201066466375_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "EWC Peacekeeper",
      "postDate": "2025-06-04T11:01:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Casual Term"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2025-06-04T11:01Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "517073",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Operations",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1391",
      "requisitionDescription": "<div><div><div><div><p id=\"isPasted\"><strong>The Organization</strong></p><p>Saskatoon Tribal Council (STC) improves the quality of life of First Nations through mutually beneficial partnerships with community organizations and industry. Opportunities for improved living are accessed through programs and services in health, safety, economic development, education, and financial investments in the broader community. Acting as a representative body for seven First Nations, STC delivers programs and services to those living in member communities and Saskatoon. More information is available at <a href=\"http://www.sktc.sk.ca\">www.sktc.sk.ca</a>.</p><p><strong><em>FIRE: Fairness, Integrity, Respect, Excellence</em></strong></p><p><strong>Position Summary</strong></p><p>The Emergency Wellness Center (EWC) Peacekeeper is to provide and maintain a safe and supportive environment in a short-term residential setting that is both culturally open and accessible to vulnerable populations. The EWC Peacekeepers will be responsible for the safety of those workers delivering direct supports to participants with complex and multiple needs ensuring that all community members are receiving the best services within and outside of the Center. The Peacekeeper will report directly to the EWC Manager or designate and will follow the Saskatoon Tribal Council Personnel and Financial Policies, The White Buffalo Youth Lodge State of Emergency Manual along with other relevant operational guidelines and procedures. These positions are available for a term ending March 31, 2027.</p><p><strong>Responsibilities</strong></p><ul><li>Security of the building;</li><li>Monitor all individuals entering the Shelter;</li><li>Provide active listening to the clients accessing the program for possible referral for further assistance;</li><li>Report and write incidents as they occur;</li><li>Ensure the building and property is maintained;</li><li>Assist EWC Support Workers in operational tasks to ensure that all procedures are being followed;</li><li>Patrol premises to prevent and detect signs of intrusion and ensure security of doors, windows, and gates;</li><li>Report and write daily logs;</li><li>Call police or fire departments in cases of emergency, such as fire or presence of unauthorized persons;</li><li>Other duties as assigned.</li></ul><p><strong>Education &amp; Experience</strong></p><ul><li>Minimum one year in security;</li><li>First Aid and CPR &ndash; C certification;</li><li><u>Security training may be available for candidates.</u></li></ul><p><strong>Knowledge, Skills &amp; Abilities</strong></p><ul><li>Knowledge of Saskatoon Inner City;</li><li>Knowledge of Indigenous traditions and culture;</li><li>Basic knowledge of computer applications;&nbsp;</li><li>Excellent communication and written skills;</li><li>Punctual and reliable;</li><li>Knowledge of the political, social and economic objectives of the Saskatoon Tribal Council and of the Dakota, Cree, and Saulteaux cultures will be considered an asset.</li></ul><p><strong>Other Work Conditions:</strong></p><ul><li>Willingness to work rotational shifts, facility operates 24 hours a day/ 7 days per week.</li><li>Must possess a valid Saskatchewan driver&rsquo;s license and meet STC&rsquo;s insurance requirements;&nbsp;</li><li>Must provide a current, original, Canadian Criminal Record Check (CPIC) with vulnerable sector search as a condition of employment.</li></ul></div></div></div></div>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "HcGf144zPqNSCAMVgeHm",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201114856764_1",
    "active": false,
    "payload": {
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "screeningRequirements": [],
      "organizationalUnits": [],
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "requisitionLocations": []
    }
  },
  {
    "id": "K2BP8gTOzkzFldnoMe8r",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201114793855_1",
    "active": false,
    "payload": {
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "screeningRequirements": [],
      "organizationalUnits": [],
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "requisitionLocations": []
    }
  },
  {
    "id": "Kx8XAVkiS7T6YGTdf4Kd",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201118167374_1",
    "active": false,
    "payload": {
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "screeningRequirements": [],
      "organizationalUnits": [],
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "requisitionLocations": []
    }
  },
  {
    "id": "msJO0CSIaCD1brLcVW55",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201109641126_1",
    "active": true,
    "payload": {
      "itemID": "9201109641126_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Reintegration Program Manager",
      "postDate": "2026-02-20T18:02:00.000-05:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Full-Time Term"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2026-02-20T18:02Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "535570",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Management",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1498",
      "requisitionDescription": "<div><div><div><p id=\"isPasted\"><strong>Position Summary:&nbsp;</strong><strong>&nbsp;</strong></p><p>The&nbsp;Reintegration Program Manager&nbsp;reports directly to the Justice Director and&nbsp;is responsible for the coordination and management of the Reintegration Program for women leaving Corrections. Through effective and proactive leadership, the Program Manager will support an integrated team of professional Reintegration Case Workers, Support Workers, Elders, and Mental Health &amp; Addiction practitioners. These programs will provide holistic wrap-around case management services and/or transportation to women referred to the program with low-level offenses who are being released from custody. The program also includes a transitional housing apartment unit for women with onsite support services. The incumbent will be subject to the STC Personnel and Financial Policy, STC Convention Act, Residential Services Act, and the Urban Justice Policy and Procedural Manual. The Program Manager will ensure program delivery is consistent with the work plan objectives outlined in the agreements with the Ministry of Integrated Justice Services and the Ministry of Health. This position is for a term that will conclude on August 31<sup>st</sup>, 2026, with possible extension subject to funding.</p><p><strong>Responsibilities:</strong></p><ul><li>Provide daily supervision to assigned Justice Staff; including creating work schedules, approving staff time sheets, leave requests and work schedule adjustments.</li><li>Regularly schedule file update meetings with staff to ensure client files are being appropriately addressed.</li><li>Ensuring that all required data collection, record keeping, and financial reporting are maintained in all facets of the STC Justice Programs and its operations.</li><li>Establish and maintain a professional and collaborative working relationship with Pine Grove Correctional Facility staff, with all justice officials, community-based organizations, other First Nations, and M&eacute;tis organizations, families of clients, other government departments and stakeholders.</li><li>Responsible for maintaining strict confidentiality requirements of the existing and proposed programming of all STC operations.</li><li>Develop strong teams to carry out the program mandates by recruiting, selecting, training and on-boarding new employees as required.</li><li>Coordinate information flow and service delivery within the program units and with other agencies to ensure staff are updated on policies, services, and available community resources.</li><li>Collaborate with the STC Justice Director on the development and implementation of program activities to meet the program objectives and goals of the reintegration programs.</li><li>Provide supervision to staff around safety protocol and effective teamwork approach to case management.</li><li>Provide leadership and coach staff for ongoing performance improvement and demonstrate job functions and procedures.</li><li>Delegate and monitor work of team members; leading the development and implementation of processes and best practices within the scope of the program/project.</li><li>Schedule and coordinate regular staff meetings.</li><li>Responsible for assisting and preparing reports/statistical information in the time frame required by funding agencies.</li><li>Responsible for preparing documents for program proposals to secure adequate resources and funding for subsequent programming.</li><li>Works within the confines of the program budgets, quarterly forecasts and implements the appropriate expenditures controls to manage costs by providing recommendations to the Director on expenses, purchases and resourcing costs prior to purchase or agreement for services; reviewing and monitoring costs; continuously seeking new ways to optimize expenses and labour costs.</li><li>Assists with monitoring and evaluating the delivery of the Justice department program and its staff establishing performance goals.&nbsp;</li><li>Evaluating employee performance to ensure goals are met and providing timely feedback, assessment of work performance and discipline if required.&nbsp;</li><li>Creating and following up with employees work and developmental plans; ensuring succession plans for self and employees to deliver program services, strategies and objectives.</li><li>Perform other related duties as defined and assigned by the reporting Director or designate on an as- required basis.</li></ul><p id=\"isPasted\"><strong>Education and Experience:</strong></p><ul><li>Post-secondary degree in business, social work or other human service-related field.&nbsp;</li><li>Five (5) years experience in direct program delivery, supervision, and management.</li><li>Experience with budget proposal writing and report writing.</li><li>A combination of skills, education, and life learning experiences may be considered.</li></ul><p><strong>Knowledge, Skills, and Abilities:&nbsp;</strong></p><ul><li>Knowledge of the Criminal Justice System including corrections and the Provincial Court process.</li><li>Strong knowledge and awareness of Indigenous culture, and both historical and contemporary Indigenous issues, the emphasis being on family violence, child welfare, the impacts of trauma, and community outreach.</li><li>An energetic self-starting person who displays initiative and strong interpersonal skills.</li><li>Analytical skills in order to evaluate program needs and results, recognize challenges, identify causes and provide solutions.</li><li>Exceptional time management, prioritization and organizational skills</li><li>Dependable with ability to work independently, submit accurate documentation, and seek guidance when needed</li><li>Excellent verbal and written communication skills are essential as well as experience conducting presentations to large groups.</li><li>Ability to manage, direct and lead staff to the achievement of goals and priorities.</li><li>Excellent time management skills with planning and scheduling of relative interviews and work-related responsibilities.</li><li>Excellent technology, computer experience, and knowledge of databases and Microsoft Office Suite are necessary.</li><li>Knowledge of the political, social, and economic objectives of the Saskatoon Tribal Council and of the Dakota, Cree, and Saulteaux cultures will be considered an asset.</li></ul><p><strong>Other Work Conditions:&nbsp;</strong></p><ul type=\"disc\"><li>Must be willing to work flexible hours, evenings, and weekends.</li><li>Travel is required.</li><li style=\"box-sizing: border-box; outline: none; --tw-shadow: 0 0 #0000; --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/); --tw-ring-offset-width: 0px; --tw-ring-offset-color: #fff; --tw-ring-color: rgba(59,130,246,.5); --tw-ring-offset-shadow: 0 0 #0000; --tw-ring-shadow: 0 0 #0000;\">Must possess a valid Saskatchewan driver&rsquo;s license, a reliable vehicle, and meet STC&rsquo;s insurance requirements.&nbsp;</li><li style=\"box-sizing: border-box; outline: none; --tw-shadow: 0 0 #0000; --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/); --tw-ring-offset-width: 0px; --tw-ring-offset-color: #fff; --tw-ring-color: rgba(59,130,246,.5); --tw-ring-offset-shadow: 0 0 #0000; --tw-ring-shadow: 0 0 #0000;\">Must provide a current, original, Canadian Criminal Record Check (CCRC) with vulnerable sector search as a condition of employment.</li></ul></div></div></div>\n",
      "requisitionLocations": []
    }
  },
  {
    "id": "RsrdlIr8KA2Rn0DgUUSW",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9200999661496_1",
    "active": true,
    "payload": {
      "itemID": "9200999661496_1",
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "requisitionTitle": "Saweyihtotan Support Worker",
      "postDate": "2024-07-23T14:07:00.000-04:00",
      "screeningRequirements": [],
      "organizationalUnits": [],
      "workLevelCode": {
        "shortName": "Casual"
      },
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [
          {
            "dateValue": "2024-07-23T14:07Z",
            "nameCode": {
              "codeValue": "PostingDate"
            }
          },
          {
            "dateValue": "2026-09-21T02:46Z",
            "nameCode": {
              "codeValue": "CurrentServerDateTime"
            }
          }
        ],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "stringValue": "502495",
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "stringValue": "Operations",
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "clientRequisitionID": "1268",
      "requisitionDescription": "<div><div><p><br></p><p id=\"isPasted\"><strong>The Organization</strong></p><p>Saskatoon Tribal Council (STC) improves the quality of life of First Nations through mutually beneficial partnerships with community organizations and industry. Opportunities for improved living are accessed through programs and services in health, safety, economic development, education, and financial investments in the broader community. Acting as a representative body for seven First Nations, STC delivers programs and services to those living in member communities and Saskatoon. More information is available at&nbsp;<a href=\"http://www.sktc.sk.ca\">www.sktc.sk.ca</a>.</p><p><strong><em>FIRE: Fairness, Integrity, Respect, Excellence</em></strong></p><p><strong>Position Summary</strong></p><p>To provide and maintain a safe and supportive environment in a short term residential setting that is both culturally open and accessible to vulnerable populations. &nbsp;The Support Worker is responsible for the general well-being of the clients residing and/or accessing services at the STC White Buffalo Youth Lodge (WBYL) Saweyihtotan Transitional House. The position will support street involved and vulnerable clients who do not have a permanent residence, and/or may be involved in other high risk behaviours. The Support Worker will be under the direct supervision and report directly to the Project Coordinator or their designate and will follow the Saskatoon Tribal Council Personnel and Financial Policies, The White Buffalo Youth Lodge State of Emergency Manual along with guidelines for the STC WBYL Transition House and Emergency Youth Shelter. This is a term position ending March 31, 2022 for overnight shift rotation with a possibility of extension subject to funding.</p><p><strong>Responsibilities</strong></p><p><strong>A. Direct Services and Resident Counselling&nbsp;</strong></p><ul><li>Establishing a trusting, non-judgemental rapport with street involved clients.&nbsp;</li><li>Ensure clients will be safe and/or will have increased protection from abuse, neglect and harm, or threat of harm.&nbsp;</li><li>Ensure all residents basic needs are met for the interim such as shelter, food, &amp; basic hygiene.&nbsp;</li><li>Assist clients with their most emergent needs at time of intake.&nbsp;</li><li>Provide information and help navigate services and opportunities available to clients within the community. &nbsp;&nbsp;</li><li>Provide updated information and education with regards to safe health practices, life skills, conflict resolution, drugs, prostitution, gangs, and community resources.</li><li>Provide a positive, safe and structured environment.</li><li>Other duties as assigned.</li></ul><p><strong>B. Daily Responsibilities &nbsp;</strong></p><ul><li>Assess clients upon initial intake and follow all resident procedures as outlined in the <em>Procedural Manuals</em>.&nbsp;</li><li>Actively supervise clients who are utilizing services.</li><li>Respond appropriately in crisis situations as outlined in procedural manual or directed by supervisor.&nbsp;</li><li>Compose and collect data for reporting purposes</li><li>Accurately report written and orally on a daily basis&nbsp;</li><li>Ensuring the facility is clean and maintained, social distancing is being adhered to, and proper PPE is being worn.</li><li>Monitor and ensure that the resident&rsquo;s physical needs such as hygiene provided for.&nbsp;</li><li>Respect and ensure residents and homes confidentiality agreement as outlined within the policy manual.&nbsp;</li><li>Report to duty as scheduled by supervisor.&nbsp;</li><li>Other duties as assigned.&nbsp;</li></ul><p><strong>Education &amp; Experience</strong></p><ul type=\"disc\"><li>Post-secondary education in a related human services field;&nbsp;</li><li>Minimum 2 years of directly related work experience; OR</li><li>Comparable combination of education and work experience;&nbsp;</li><li>First Aid and CPR certification.</li></ul><p><strong>Knowledge, Skills &amp; Abilities</strong></p><ul type=\"disc\"><li>Sensitivity towards cultural differences with particular emphasis on First Nations and Metis People.&nbsp;</li><li>Knowledge of Indigenous traditions and culture.</li><li>Experience/knowledge of homelessness and group home settings is an asset.&nbsp;</li><li>Ability to communicate and effectively interact with clients.&nbsp;</li><li>Ability to identify issues of abuse which may include child sexual abuse, sexual exploitation, physical abuse.</li><li>&ldquo;Street Smarts&rdquo; and awareness of street lifestyle and its potential impact on clients and their families.&nbsp;</li><li>Ability to deal with emergency situations related to health, safety and addictions.</li><li>Ability to work as a team member, as well as individually.</li><li>Knowledge of basic computer programs, specifically Microsoft office and Excel.</li></ul><p><strong>Other Conditions:</strong></p><ul type=\"disc\"><li>Must possess a valid driver&rsquo;s license (class 5) and meet STC&rsquo;s insurance requirements as a condition of employment.&nbsp;</li><li>Must provide a current Canadian Criminal Record Check (CPIC) with vulnerable sector search as a condition of employment.&nbsp;</li><li>Must be flexible and able to do Shift Work. Facilities are staffed with rotational shift schedules including evenings, nights and weekends.</li></ul><p><br></p></div></div>\n",
      "requisitionLocations": [
        {
          "aliasNames": [],
          "address": {
            "cityName": "Saskatoon",
            "countrySubdivisionLevel1": {
              "codeValue": "SK"
            },
            "postalCode": "S7N 4S1"
          },
          "nameCode": {
            "shortName": " Saskatoon, SK, CA"
          }
        }
      ]
    }
  },
  {
    "id": "TEIAjYDMwnorXK4KVgDN",
    "sourceKey": "adp:a76445e7-5b3c-4a1b-95c0-2ab1f96ab518:9201115341244_1",
    "active": false,
    "payload": {
      "postingInstructions": [],
      "links": [],
      "additionalProperties": {},
      "screeningRequirements": [],
      "organizationalUnits": [],
      "sponsoredVisaTypeCodes": [],
      "customFieldGroup": {
        "dateFields": [],
        "indicatorFields": [
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "PriortyStatusFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "InternalPostingFlag"
            }
          },
          {
            "indicatorValue": true,
            "nameCode": {
              "codeValue": "MinValue"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsVsidApplicable"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForExtPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsSassDlReqForIntPostFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsMonetaryFlag"
            }
          },
          {
            "indicatorValue": false,
            "nameCode": {
              "codeValue": "IsNonMonetaryFlag"
            }
          }
        ],
        "numberFields": [
          {
            "numberValue": 0.0,
            "categoryCode": {
              "codeValue": "ApplicantCount"
            }
          },
          {
            "categoryCode": {
              "codeValue": "AwardAmount"
            }
          }
        ],
        "stringFields": [
          {
            "nameCode": {
              "codeValue": "ExternalJobID"
            }
          },
          {
            "nameCode": {
              "codeValue": "CareerCenterRefId"
            }
          },
          {
            "nameCode": {
              "codeValue": "GuidelineOid"
            }
          },
          {
            "nameCode": {
              "codeValue": "CurrencySymbolOrCode"
            }
          },
          {
            "stringValue": "",
            "nameCode": {
              "codeValue": "HomeDepartment"
            }
          },
          {
            "nameCode": {
              "codeValue": "JobClass"
            }
          }
        ]
      },
      "requisitionLocations": []
    }
  }
];

const live=captures.find(c=>c.active)!;
async function parse(payload:unknown,key=live.sourceKey) {
 return createAdpCleanupProvider({fetch:async()=>Response.json(payload)})(key);
}

test('explicit contradictory/unknown/malformed status cannot use the statusless fallback',async()=>{
 for(const status of [null,{},[],{codeValue:'UNKNOWN'},{codeValue:'closed'},'OPEN',false,{codeValue:[]}]) {
  await assert.rejects(parse({...live.payload,requisitionStatusCode:status}),CleanupConflict);
 }
 // Explicit CLOSED remains authoritative, never overridden by posting content.
 assert.equal((await parse({...live.payload,requisitionStatusCode:{codeValue:'CLOSED'}})).status,'closed');
 assert.equal((await parse({...live.payload,requisitionStatusCode:{codeValue:'OPEN'}})).status,'active');
});

test('statusless recognition requires exact string identity and optional tenant binding',async()=>{
 for(const itemID of ['other',null,{},[live.payload.itemID]]) {
  await assert.rejects(parse({...live.payload,itemID}),CleanupConflict);
 }
 for(const cid of ['other',null,[live.sourceKey.split(':')[1]]]) {
  await assert.rejects(parse({...live.payload,cid}),CleanupConflict);
 }
 await assert.rejects(parse({...live.payload,itemID:123},'adp:'+live.sourceKey.split(':')[1]+':123'),CleanupConflict);
 assert.equal((await parse({...live.payload,cid:live.sourceKey.split(':')[1]})).status,'active');
});

test('unknown shapes and incomplete statusless postings fail closed',async()=>{
 for(const payload of [null,[],{},'posting',123,{payload:live.payload},...['requisitionTitle','requisitionDescription'].flatMap(field=>[null,'','  ',[],{}].map(value=>({...live.payload,[field]:value})))]) {
  await assert.rejects(parse(payload),CleanupConflict);
 }
});

test('invalid source cannot trigger a network call',async()=>{
 let calls=0;
 const provider=createAdpCleanupProvider({fetch:async()=>{calls++;throw new Error('unexpected fetch');}});
 for(const source of ['https://evil.test',live.sourceKey+'/extra','adp:not-a-tenant:123'])await assert.rejects(provider(source),CleanupConflict);
 assert.equal(calls,0);
});

for (const capture of captures) {
 test(`saved ADP payload ${capture.id}: ${capture.active ? 'active without invented status' : 'no posting is NOT closed proof'}`, async () => {
  assert.equal('requisitionStatusCode' in capture.payload, false);
  const body=JSON.stringify(capture.payload);
  const provider=createAdpCleanupProvider({now:()=>1234,fetch:async(url,init)=>{
   const parsed=new URL(String(url));
   assert.equal(parsed.origin,'https://workforcenow.adp.com');
   assert.equal(parsed.pathname,'/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions/'+capture.sourceKey.split(':')[2]);
   assert.equal(parsed.searchParams.get('cid'),capture.sourceKey.split(':')[1]);
   assert.equal(init?.redirect,'error');
   assert.equal(init?.cache,'no-store');
   return new Response(body,{headers:{'content-type':'application/json'}});
  }});
  if (!capture.active) {await assert.rejects(provider(capture.sourceKey),CleanupConflict);return;}
  const evidence:CleanupEvidence=await provider(capture.sourceKey);
  assert.deepEqual(evidence,{provider:'adp',sourceKey:capture.sourceKey,checkedAt:1234,status:'active',evidenceDigest:createHash('sha256').update(body).digest('hex')});
 });
}
