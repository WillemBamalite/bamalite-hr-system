/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/check-probation/route";
exports.ids = ["app/api/check-probation/route"];
exports.modules = {

/***/ "(rsc)/./app/api/check-probation/route.ts":
/*!******************************************!*\
  !*** ./app/api/check-probation/route.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_supabase__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabase */ \"(rsc)/./lib/supabase.ts\");\n/* harmony import */ var nodemailer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! nodemailer */ \"(rsc)/./node_modules/nodemailer/lib/nodemailer.js\");\n\n\n\nconst transporter = nodemailer__WEBPACK_IMPORTED_MODULE_2__.createTransport({\n    service: 'gmail',\n    auth: {\n        user: process.env.GMAIL_USER,\n        pass: process.env.GMAIL_APP_PASSWORD\n    }\n});\nasync function GET() {\n    try {\n        // Fetch all crew members with in_dienst_vanaf\n        const { data: crewMembers, error } = await _lib_supabase__WEBPACK_IMPORTED_MODULE_1__.supabase.from('crew').select('id, first_name, last_name, in_dienst_vanaf, position, ship_id').not('in_dienst_vanaf', 'is', null).eq('is_dummy', false);\n        if (error) {\n            console.error('Error fetching crew:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Database error'\n            }, {\n                status: 500\n            });\n        }\n        const today = new Date();\n        today.setHours(0, 0, 0, 0);\n        const emailsSent = [];\n        for (const member of crewMembers || []){\n            if (!member.in_dienst_vanaf) continue;\n            const startDate = new Date(member.in_dienst_vanaf);\n            startDate.setHours(0, 0, 0, 0);\n            // Calculate days since start\n            const diffTime = today.getTime() - startDate.getTime();\n            const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));\n            // Check if exactly 70 days (20 days until probation ends)\n            if (daysSinceStart === 70) {\n                const fullName = `${member.first_name} ${member.last_name}`;\n                // Send email\n                const mailOptions = {\n                    from: `\"Bemanningslijst\" <${process.env.GMAIL_USER}>`,\n                    to: 'nautic@bamalite.com',\n                    subject: `⚠️ Proeftijd verloopt over 20 dagen: ${fullName}`,\n                    text: `Let op! De proefperiode van ${fullName} verloopt over 20 dagen.\\n\\nDatum in dienst: ${new Date(member.in_dienst_vanaf).toLocaleDateString('nl-NL')}\\nFunctie: ${member.position || 'Onbekend'}\\n\\nNeem contact op om de werkzaamheden te evalueren.`,\n                    html: `\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">\n              <div style=\"background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;\">\n                <h1 style=\"color: white; margin: 0; font-size: 20px;\">⚠️ Proeftijd verloopt over 20 dagen</h1>\n              </div>\n              <div style=\"background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;\">\n                <p style=\"font-size: 16px; color: #374151; margin-bottom: 20px;\">\n                  Let op! De proefperiode van <strong>${fullName}</strong> verloopt over 20 dagen.\n                </p>\n                <table style=\"width: 100%; border-collapse: collapse;\">\n                  <tr>\n                    <td style=\"padding: 8px 0; color: #6b7280;\">Datum in dienst:</td>\n                    <td style=\"padding: 8px 0; font-weight: 600;\">${new Date(member.in_dienst_vanaf).toLocaleDateString('nl-NL')}</td>\n                  </tr>\n                  <tr>\n                    <td style=\"padding: 8px 0; color: #6b7280;\">Functie:</td>\n                    <td style=\"padding: 8px 0; font-weight: 600;\">${member.position || 'Onbekend'}</td>\n                  </tr>\n                </table>\n                <div style=\"margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;\">\n                  <p style=\"margin: 0; color: #92400e; font-size: 14px;\">\n                    📋 Neem contact op om de werkzaamheden te evalueren voordat de proeftijd afloopt.\n                  </p>\n                </div>\n              </div>\n            </div>\n          `\n                };\n                try {\n                    await transporter.sendMail(mailOptions);\n                    emailsSent.push(fullName);\n                    console.log(`Probation email sent for: ${fullName}`);\n                } catch (emailError) {\n                    console.error(`Failed to send email for ${fullName}:`, emailError);\n                }\n            }\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            emailsSent,\n            message: `Checked ${crewMembers?.length || 0} crew members, sent ${emailsSent.length} probation emails`\n        });\n    } catch (error) {\n        console.error('Error in check-probation:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Internal server error'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2NoZWNrLXByb2JhdGlvbi9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQTBDO0FBQ0Q7QUFDTjtBQUVuQyxNQUFNRyxjQUFjRCx1REFBMEIsQ0FBQztJQUM3Q0csU0FBUztJQUNUQyxNQUFNO1FBQ0pDLE1BQU1DLFFBQVFDLEdBQUcsQ0FBQ0MsVUFBVTtRQUM1QkMsTUFBTUgsUUFBUUMsR0FBRyxDQUFDRyxrQkFBa0I7SUFDdEM7QUFDRjtBQUVPLGVBQWVDO0lBQ3BCLElBQUk7UUFDRiw4Q0FBOEM7UUFDOUMsTUFBTSxFQUFFQyxNQUFNQyxXQUFXLEVBQUVDLEtBQUssRUFBRSxHQUFHLE1BQU1mLG1EQUFRQSxDQUNoRGdCLElBQUksQ0FBQyxRQUNMQyxNQUFNLENBQUMsaUVBQ1BDLEdBQUcsQ0FBQyxtQkFBbUIsTUFBTSxNQUM3QkMsRUFBRSxDQUFDLFlBQVk7UUFFbEIsSUFBSUosT0FBTztZQUNUSyxRQUFRTCxLQUFLLENBQUMsd0JBQXdCQTtZQUN0QyxPQUFPaEIscURBQVlBLENBQUNzQixJQUFJLENBQUM7Z0JBQUVOLE9BQU87WUFBaUIsR0FBRztnQkFBRU8sUUFBUTtZQUFJO1FBQ3RFO1FBRUEsTUFBTUMsUUFBUSxJQUFJQztRQUNsQkQsTUFBTUUsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHO1FBRXhCLE1BQU1DLGFBQXVCLEVBQUU7UUFFL0IsS0FBSyxNQUFNQyxVQUFVYixlQUFlLEVBQUUsQ0FBRTtZQUN0QyxJQUFJLENBQUNhLE9BQU9DLGVBQWUsRUFBRTtZQUU3QixNQUFNQyxZQUFZLElBQUlMLEtBQUtHLE9BQU9DLGVBQWU7WUFDakRDLFVBQVVKLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRztZQUU1Qiw2QkFBNkI7WUFDN0IsTUFBTUssV0FBV1AsTUFBTVEsT0FBTyxLQUFLRixVQUFVRSxPQUFPO1lBQ3BELE1BQU1DLGlCQUFpQkMsS0FBS0MsS0FBSyxDQUFDSixXQUFZLFFBQU8sS0FBSyxLQUFLLEVBQUM7WUFFaEUsMERBQTBEO1lBQzFELElBQUlFLG1CQUFtQixJQUFJO2dCQUN6QixNQUFNRyxXQUFXLEdBQUdSLE9BQU9TLFVBQVUsQ0FBQyxDQUFDLEVBQUVULE9BQU9VLFNBQVMsRUFBRTtnQkFFM0QsYUFBYTtnQkFDYixNQUFNQyxjQUFjO29CQUNsQnRCLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRVQsUUFBUUMsR0FBRyxDQUFDQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUNyRDhCLElBQUk7b0JBQ0pDLFNBQVMsQ0FBQyxxQ0FBcUMsRUFBRUwsVUFBVTtvQkFDM0RNLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRU4sU0FBUyw2Q0FBNkMsRUFBRSxJQUFJWCxLQUFLRyxPQUFPQyxlQUFlLEVBQUVjLGtCQUFrQixDQUFDLFNBQVMsV0FBVyxFQUFFZixPQUFPZ0IsUUFBUSxJQUFJLFdBQVcscURBQXFELENBQUM7b0JBQzNQQyxNQUFNLENBQUM7Ozs7Ozs7c0RBT3FDLEVBQUVULFNBQVM7Ozs7O2tFQUtDLEVBQUUsSUFBSVgsS0FBS0csT0FBT0MsZUFBZSxFQUFFYyxrQkFBa0IsQ0FBQyxTQUFTOzs7O2tFQUkvRCxFQUFFZixPQUFPZ0IsUUFBUSxJQUFJLFdBQVc7Ozs7Ozs7Ozs7VUFVeEYsQ0FBQztnQkFDSDtnQkFFQSxJQUFJO29CQUNGLE1BQU16QyxZQUFZMkMsUUFBUSxDQUFDUDtvQkFDM0JaLFdBQVdvQixJQUFJLENBQUNYO29CQUNoQmYsUUFBUTJCLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixFQUFFWixVQUFVO2dCQUNyRCxFQUFFLE9BQU9hLFlBQVk7b0JBQ25CNUIsUUFBUUwsS0FBSyxDQUFDLENBQUMseUJBQXlCLEVBQUVvQixTQUFTLENBQUMsQ0FBQyxFQUFFYTtnQkFDekQ7WUFDRjtRQUNGO1FBRUEsT0FBT2pELHFEQUFZQSxDQUFDc0IsSUFBSSxDQUFDO1lBQ3ZCNEIsU0FBUztZQUNUdkI7WUFDQXdCLFNBQVMsQ0FBQyxRQUFRLEVBQUVwQyxhQUFhcUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFekIsV0FBV3lCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUN6RztJQUVGLEVBQUUsT0FBT3BDLE9BQU87UUFDZEssUUFBUUwsS0FBSyxDQUFDLDZCQUE2QkE7UUFDM0MsT0FBT2hCLHFEQUFZQSxDQUFDc0IsSUFBSSxDQUFDO1lBQUVOLE9BQU87UUFBd0IsR0FBRztZQUFFTyxRQUFRO1FBQUk7SUFDN0U7QUFDRiIsInNvdXJjZXMiOlsiQzpcXERldlxcYmFtYWxpdGUtaHItc3lzdGVtIEJlbWFubmluZ3NsaWpzdFxcYXBwXFxhcGlcXGNoZWNrLXByb2JhdGlvblxccm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInXHJcbmltcG9ydCB7IHN1cGFiYXNlIH0gZnJvbSAnQC9saWIvc3VwYWJhc2UnXHJcbmltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInXHJcblxyXG5jb25zdCB0cmFuc3BvcnRlciA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcclxuICBzZXJ2aWNlOiAnZ21haWwnLFxyXG4gIGF1dGg6IHtcclxuICAgIHVzZXI6IHByb2Nlc3MuZW52LkdNQUlMX1VTRVIsXHJcbiAgICBwYXNzOiBwcm9jZXNzLmVudi5HTUFJTF9BUFBfUEFTU1dPUkQsXHJcbiAgfSxcclxufSlcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQoKSB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEZldGNoIGFsbCBjcmV3IG1lbWJlcnMgd2l0aCBpbl9kaWVuc3RfdmFuYWZcclxuICAgIGNvbnN0IHsgZGF0YTogY3Jld01lbWJlcnMsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxyXG4gICAgICAuZnJvbSgnY3JldycpXHJcbiAgICAgIC5zZWxlY3QoJ2lkLCBmaXJzdF9uYW1lLCBsYXN0X25hbWUsIGluX2RpZW5zdF92YW5hZiwgcG9zaXRpb24sIHNoaXBfaWQnKVxyXG4gICAgICAubm90KCdpbl9kaWVuc3RfdmFuYWYnLCAnaXMnLCBudWxsKVxyXG4gICAgICAuZXEoJ2lzX2R1bW15JywgZmFsc2UpXHJcblxyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGNyZXc6JywgZXJyb3IpXHJcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnRGF0YWJhc2UgZXJyb3InIH0sIHsgc3RhdHVzOiA1MDAgfSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKClcclxuICAgIHRvZGF5LnNldEhvdXJzKDAsIDAsIDAsIDApXHJcbiAgICBcclxuICAgIGNvbnN0IGVtYWlsc1NlbnQ6IHN0cmluZ1tdID0gW11cclxuXHJcbiAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBjcmV3TWVtYmVycyB8fCBbXSkge1xyXG4gICAgICBpZiAoIW1lbWJlci5pbl9kaWVuc3RfdmFuYWYpIGNvbnRpbnVlXHJcblxyXG4gICAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZShtZW1iZXIuaW5fZGllbnN0X3ZhbmFmKVxyXG4gICAgICBzdGFydERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMClcclxuICAgICAgXHJcbiAgICAgIC8vIENhbGN1bGF0ZSBkYXlzIHNpbmNlIHN0YXJ0XHJcbiAgICAgIGNvbnN0IGRpZmZUaW1lID0gdG9kYXkuZ2V0VGltZSgpIC0gc3RhcnREYXRlLmdldFRpbWUoKVxyXG4gICAgICBjb25zdCBkYXlzU2luY2VTdGFydCA9IE1hdGguZmxvb3IoZGlmZlRpbWUgLyAoMTAwMCAqIDYwICogNjAgKiAyNCkpXHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBleGFjdGx5IDcwIGRheXMgKDIwIGRheXMgdW50aWwgcHJvYmF0aW9uIGVuZHMpXHJcbiAgICAgIGlmIChkYXlzU2luY2VTdGFydCA9PT0gNzApIHtcclxuICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke21lbWJlci5maXJzdF9uYW1lfSAke21lbWJlci5sYXN0X25hbWV9YFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNlbmQgZW1haWxcclxuICAgICAgICBjb25zdCBtYWlsT3B0aW9ucyA9IHtcclxuICAgICAgICAgIGZyb206IGBcIkJlbWFubmluZ3NsaWpzdFwiIDwke3Byb2Nlc3MuZW52LkdNQUlMX1VTRVJ9PmAsXHJcbiAgICAgICAgICB0bzogJ25hdXRpY0BiYW1hbGl0ZS5jb20nLFxyXG4gICAgICAgICAgc3ViamVjdDogYOKaoO+4jyBQcm9lZnRpamQgdmVybG9vcHQgb3ZlciAyMCBkYWdlbjogJHtmdWxsTmFtZX1gLFxyXG4gICAgICAgICAgdGV4dDogYExldCBvcCEgRGUgcHJvZWZwZXJpb2RlIHZhbiAke2Z1bGxOYW1lfSB2ZXJsb29wdCBvdmVyIDIwIGRhZ2VuLlxcblxcbkRhdHVtIGluIGRpZW5zdDogJHtuZXcgRGF0ZShtZW1iZXIuaW5fZGllbnN0X3ZhbmFmKS50b0xvY2FsZURhdGVTdHJpbmcoJ25sLU5MJyl9XFxuRnVuY3RpZTogJHttZW1iZXIucG9zaXRpb24gfHwgJ09uYmVrZW5kJ31cXG5cXG5OZWVtIGNvbnRhY3Qgb3Agb20gZGUgd2Vya3phYW1oZWRlbiB0ZSBldmFsdWVyZW4uYCxcclxuICAgICAgICAgIGh0bWw6IGBcclxuICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbWF4LXdpZHRoOiA2MDBweDsgbWFyZ2luOiAwIGF1dG87IHBhZGRpbmc6IDIwcHg7XCI+XHJcbiAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxMzVkZWcsICNmNTllMGIgMCUsICNkOTc3MDYgMTAwJSk7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweCA4cHggMCAwO1wiPlxyXG4gICAgICAgICAgICAgICAgPGgxIHN0eWxlPVwiY29sb3I6IHdoaXRlOyBtYXJnaW46IDA7IGZvbnQtc2l6ZTogMjBweDtcIj7imqDvuI8gUHJvZWZ0aWpkIHZlcmxvb3B0IG92ZXIgMjAgZGFnZW48L2gxPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJiYWNrZ3JvdW5kOiAjZmZmOyBwYWRkaW5nOiAyMHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZTVlN2ViOyBib3JkZXItdG9wOiBub25lOyBib3JkZXItcmFkaXVzOiAwIDAgOHB4IDhweDtcIj5cclxuICAgICAgICAgICAgICAgIDxwIHN0eWxlPVwiZm9udC1zaXplOiAxNnB4OyBjb2xvcjogIzM3NDE1MTsgbWFyZ2luLWJvdHRvbTogMjBweDtcIj5cclxuICAgICAgICAgICAgICAgICAgTGV0IG9wISBEZSBwcm9lZnBlcmlvZGUgdmFuIDxzdHJvbmc+JHtmdWxsTmFtZX08L3N0cm9uZz4gdmVybG9vcHQgb3ZlciAyMCBkYWdlbi5cclxuICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgIDx0YWJsZSBzdHlsZT1cIndpZHRoOiAxMDAlOyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1wiPlxyXG4gICAgICAgICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4IDA7IGNvbG9yOiAjNmI3MjgwO1wiPkRhdHVtIGluIGRpZW5zdDo8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweCAwOyBmb250LXdlaWdodDogNjAwO1wiPiR7bmV3IERhdGUobWVtYmVyLmluX2RpZW5zdF92YW5hZikudG9Mb2NhbGVEYXRlU3RyaW5nKCdubC1OTCcpfTwvdGQ+XHJcbiAgICAgICAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHggMDsgY29sb3I6ICM2YjcyODA7XCI+RnVuY3RpZTo8L3RkPlxyXG4gICAgICAgICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweCAwOyBmb250LXdlaWdodDogNjAwO1wiPiR7bWVtYmVyLnBvc2l0aW9uIHx8ICdPbmJla2VuZCd9PC90ZD5cclxuICAgICAgICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgICAgIDwvdGFibGU+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDogMjBweDsgcGFkZGluZzogMTVweDsgYmFja2dyb3VuZDogI2ZlZjNjNzsgYm9yZGVyLXJhZGl1czogNnB4O1wiPlxyXG4gICAgICAgICAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbjogMDsgY29sb3I6ICM5MjQwMGU7IGZvbnQtc2l6ZTogMTRweDtcIj5cclxuICAgICAgICAgICAgICAgICAgICDwn5OLIE5lZW0gY29udGFjdCBvcCBvbSBkZSB3ZXJremFhbWhlZGVuIHRlIGV2YWx1ZXJlbiB2b29yZGF0IGRlIHByb2VmdGlqZCBhZmxvb3B0LlxyXG4gICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICBgLFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGF3YWl0IHRyYW5zcG9ydGVyLnNlbmRNYWlsKG1haWxPcHRpb25zKVxyXG4gICAgICAgICAgZW1haWxzU2VudC5wdXNoKGZ1bGxOYW1lKVxyXG4gICAgICAgICAgY29uc29sZS5sb2coYFByb2JhdGlvbiBlbWFpbCBzZW50IGZvcjogJHtmdWxsTmFtZX1gKVxyXG4gICAgICAgIH0gY2F0Y2ggKGVtYWlsRXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzZW5kIGVtYWlsIGZvciAke2Z1bGxOYW1lfTpgLCBlbWFpbEVycm9yKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIGVtYWlsc1NlbnQsXHJcbiAgICAgIG1lc3NhZ2U6IGBDaGVja2VkICR7Y3Jld01lbWJlcnM/Lmxlbmd0aCB8fCAwfSBjcmV3IG1lbWJlcnMsIHNlbnQgJHtlbWFpbHNTZW50Lmxlbmd0aH0gcHJvYmF0aW9uIGVtYWlsc2BcclxuICAgIH0pXHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBjaGVjay1wcm9iYXRpb246JywgZXJyb3IpXHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSwgeyBzdGF0dXM6IDUwMCB9KVxyXG4gIH1cclxufVxyXG5cclxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsInN1cGFiYXNlIiwibm9kZW1haWxlciIsInRyYW5zcG9ydGVyIiwiY3JlYXRlVHJhbnNwb3J0Iiwic2VydmljZSIsImF1dGgiLCJ1c2VyIiwicHJvY2VzcyIsImVudiIsIkdNQUlMX1VTRVIiLCJwYXNzIiwiR01BSUxfQVBQX1BBU1NXT1JEIiwiR0VUIiwiZGF0YSIsImNyZXdNZW1iZXJzIiwiZXJyb3IiLCJmcm9tIiwic2VsZWN0Iiwibm90IiwiZXEiLCJjb25zb2xlIiwianNvbiIsInN0YXR1cyIsInRvZGF5IiwiRGF0ZSIsInNldEhvdXJzIiwiZW1haWxzU2VudCIsIm1lbWJlciIsImluX2RpZW5zdF92YW5hZiIsInN0YXJ0RGF0ZSIsImRpZmZUaW1lIiwiZ2V0VGltZSIsImRheXNTaW5jZVN0YXJ0IiwiTWF0aCIsImZsb29yIiwiZnVsbE5hbWUiLCJmaXJzdF9uYW1lIiwibGFzdF9uYW1lIiwibWFpbE9wdGlvbnMiLCJ0byIsInN1YmplY3QiLCJ0ZXh0IiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwicG9zaXRpb24iLCJodG1sIiwic2VuZE1haWwiLCJwdXNoIiwibG9nIiwiZW1haWxFcnJvciIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwibGVuZ3RoIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/check-probation/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabase.ts":
/*!*************************!*\
  !*** ./lib/supabase.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\n// Hardcoded values for local development\nconst supabaseUrl = 'https://ocwraavhrtpvbqlkwnlb.supabase.co';\nconst supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3JhYXZocnRwdmJxbGt3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDEzOTAsImV4cCI6MjA2OTAxNzM5MH0.TC3wV4T74ZBadMtIXI1QBroYbo844ejqv_pJtg0th04';\n// Create Supabase client with better error handling\nlet supabase;\ntry {\n    supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, supabaseAnonKey);\n    console.log('✅ Supabase client created successfully');\n} catch (error) {\n    console.error('❌ Failed to create Supabase client:', error);\n    // Create a mock Supabase client for local development\n    supabase = {\n        from: (table)=>({\n                select: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                insert: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                update: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                delete: ()=>({\n                        error: null\n                    }),\n                eq: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                single: ()=>({\n                        data: null,\n                        error: null\n                    }),\n                order: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                limit: ()=>({\n                        data: [],\n                        error: null\n                    }),\n                not: ()=>({\n                        data: [],\n                        error: null\n                    })\n            }),\n        auth: {\n            getSession: ()=>({\n                    data: {\n                        session: null\n                    },\n                    error: null\n                })\n        },\n        channel: ()=>({\n                on: ()=>({\n                        subscribe: ()=>{},\n                        unsubscribe: ()=>{}\n                    })\n            })\n    };\n    console.log('⚠️ Using mock Supabase client for local development');\n}\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2UudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBb0Q7QUFFcEQseUNBQXlDO0FBQ3pDLE1BQU1DLGNBQWM7QUFDcEIsTUFBTUMsa0JBQWtCO0FBRXhCLG9EQUFvRDtBQUNwRCxJQUFJQztBQUVKLElBQUk7SUFDRkEsV0FBV0gsbUVBQVlBLENBQUNDLGFBQWFDO0lBQ3JDRSxRQUFRQyxHQUFHLENBQUM7QUFDZCxFQUFFLE9BQU9DLE9BQU87SUFDZEYsUUFBUUUsS0FBSyxDQUFDLHVDQUF1Q0E7SUFFckQsc0RBQXNEO0lBQ3RESCxXQUFXO1FBQ1RJLE1BQU0sQ0FBQ0MsUUFBbUI7Z0JBQ3hCQyxRQUFRLElBQU87d0JBQUVDLE1BQU0sRUFBRTt3QkFBRUosT0FBTztvQkFBSztnQkFDdkNLLFFBQVEsSUFBTzt3QkFBRUQsTUFBTSxFQUFFO3dCQUFFSixPQUFPO29CQUFLO2dCQUN2Q00sUUFBUSxJQUFPO3dCQUFFRixNQUFNLEVBQUU7d0JBQUVKLE9BQU87b0JBQUs7Z0JBQ3ZDTyxRQUFRLElBQU87d0JBQUVQLE9BQU87b0JBQUs7Z0JBQzdCUSxJQUFJLElBQU87d0JBQUVKLE1BQU0sRUFBRTt3QkFBRUosT0FBTztvQkFBSztnQkFDbkNTLFFBQVEsSUFBTzt3QkFBRUwsTUFBTTt3QkFBTUosT0FBTztvQkFBSztnQkFDekNVLE9BQU8sSUFBTzt3QkFBRU4sTUFBTSxFQUFFO3dCQUFFSixPQUFPO29CQUFLO2dCQUN0Q1csT0FBTyxJQUFPO3dCQUFFUCxNQUFNLEVBQUU7d0JBQUVKLE9BQU87b0JBQUs7Z0JBQ3RDWSxLQUFLLElBQU87d0JBQUVSLE1BQU0sRUFBRTt3QkFBRUosT0FBTztvQkFBSztZQUN0QztRQUNBYSxNQUFNO1lBQ0pDLFlBQVksSUFBTztvQkFBRVYsTUFBTTt3QkFBRVcsU0FBUztvQkFBSztvQkFBR2YsT0FBTztnQkFBSztRQUM1RDtRQUNBZ0IsU0FBUyxJQUFPO2dCQUNkQyxJQUFJLElBQU87d0JBQUVDLFdBQVcsS0FBTzt3QkFBR0MsYUFBYSxLQUFPO29CQUFFO1lBQzFEO0lBQ0Y7SUFDQXJCLFFBQVFDLEdBQUcsQ0FBQztBQUNkO0FBRW1CIiwic291cmNlcyI6WyJDOlxcRGV2XFxiYW1hbGl0ZS1oci1zeXN0ZW0gQmVtYW5uaW5nc2xpanN0XFxsaWJcXHN1cGFiYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcydcclxuXHJcbi8vIEhhcmRjb2RlZCB2YWx1ZXMgZm9yIGxvY2FsIGRldmVsb3BtZW50XHJcbmNvbnN0IHN1cGFiYXNlVXJsID0gJ2h0dHBzOi8vb2N3cmFhdmhydHB2YnFsa3dubGIuc3VwYWJhc2UuY28nXHJcbmNvbnN0IHN1cGFiYXNlQW5vbktleSA9ICdleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUp6ZFhCaFltRnpaU0lzSW5KbFppSTZJbTlqZDNKaFlYWm9jblJ3ZG1KeGJHdDNibXhpSWl3aWNtOXNaU0k2SW1GdWIyNGlMQ0pwWVhRaU9qRTNOVE0wTkRFek9UQXNJbVY0Y0NJNk1qQTJPVEF4TnpNNU1IMC5UQzN3VjRUNzRaQmFkTXRJWEkxUUJyb1libzg0NGVqcXZfcEp0ZzB0aDA0J1xyXG5cclxuLy8gQ3JlYXRlIFN1cGFiYXNlIGNsaWVudCB3aXRoIGJldHRlciBlcnJvciBoYW5kbGluZ1xyXG5sZXQgc3VwYWJhc2U6IGFueVxyXG5cclxudHJ5IHtcclxuICBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VBbm9uS2V5KVxyXG4gIGNvbnNvbGUubG9nKCfinIUgU3VwYWJhc2UgY2xpZW50IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JylcclxufSBjYXRjaCAoZXJyb3IpIHtcclxuICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGNyZWF0ZSBTdXBhYmFzZSBjbGllbnQ6JywgZXJyb3IpXHJcbiAgXHJcbiAgLy8gQ3JlYXRlIGEgbW9jayBTdXBhYmFzZSBjbGllbnQgZm9yIGxvY2FsIGRldmVsb3BtZW50XHJcbiAgc3VwYWJhc2UgPSB7XHJcbiAgICBmcm9tOiAodGFibGU6IHN0cmluZykgPT4gKHtcclxuICAgICAgc2VsZWN0OiAoKSA9PiAoeyBkYXRhOiBbXSwgZXJyb3I6IG51bGwgfSksXHJcbiAgICAgIGluc2VydDogKCkgPT4gKHsgZGF0YTogW10sIGVycm9yOiBudWxsIH0pLFxyXG4gICAgICB1cGRhdGU6ICgpID0+ICh7IGRhdGE6IFtdLCBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgZGVsZXRlOiAoKSA9PiAoeyBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgZXE6ICgpID0+ICh7IGRhdGE6IFtdLCBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgc2luZ2xlOiAoKSA9PiAoeyBkYXRhOiBudWxsLCBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgb3JkZXI6ICgpID0+ICh7IGRhdGE6IFtdLCBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgbGltaXQ6ICgpID0+ICh7IGRhdGE6IFtdLCBlcnJvcjogbnVsbCB9KSxcclxuICAgICAgbm90OiAoKSA9PiAoeyBkYXRhOiBbXSwgZXJyb3I6IG51bGwgfSlcclxuICAgIH0pLFxyXG4gICAgYXV0aDoge1xyXG4gICAgICBnZXRTZXNzaW9uOiAoKSA9PiAoeyBkYXRhOiB7IHNlc3Npb246IG51bGwgfSwgZXJyb3I6IG51bGwgfSlcclxuICAgIH0sXHJcbiAgICBjaGFubmVsOiAoKSA9PiAoe1xyXG4gICAgICBvbjogKCkgPT4gKHsgc3Vic2NyaWJlOiAoKSA9PiB7fSwgdW5zdWJzY3JpYmU6ICgpID0+IHt9IH0pXHJcbiAgICB9KVxyXG4gIH1cclxuICBjb25zb2xlLmxvZygn4pqg77iPIFVzaW5nIG1vY2sgU3VwYWJhc2UgY2xpZW50IGZvciBsb2NhbCBkZXZlbG9wbWVudCcpXHJcbn1cclxuXHJcbmV4cG9ydCB7IHN1cGFiYXNlIH1cclxuXHJcbi8vIERhdGFiYXNlIHR5cGVzXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2hpcCB7XHJcbiAgaWQ6IHN0cmluZ1xyXG4gIG5hbWU6IHN0cmluZ1xyXG4gIG1heF9jcmV3OiBudW1iZXJcclxuICBjcmVhdGVkX2F0OiBzdHJpbmdcclxuICB1cGRhdGVkX2F0OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmV3IHtcclxuICBpZDogc3RyaW5nXHJcbiAgZmlyc3RfbmFtZTogc3RyaW5nXHJcbiAgbGFzdF9uYW1lOiBzdHJpbmdcclxuICBuYXRpb25hbGl0eTogc3RyaW5nXHJcbiAgcG9zaXRpb246IHN0cmluZ1xyXG4gIHNoaXBfaWQ6IHN0cmluZ1xyXG4gIHJlZ2ltZTogc3RyaW5nXHJcbiAgcGhvbmU/OiBzdHJpbmdcclxuICBlbWFpbD86IHN0cmluZ1xyXG4gIHN0YXR1czogJ2Fhbi1ib29yZCcgfCAndGh1aXMnIHwgJ25vZy1pbi10ZS1kZWxlbicgfCAnemllaycgfCAndWl0LWRpZW5zdCcgfCAnYWZ3ZXppZydcclxuICBvbl9ib2FyZF9zaW5jZT86IHN0cmluZ1xyXG4gIHRodWlzX3NpbmRzPzogc3RyaW5nXHJcbiAgYmlydGhfZGF0ZTogc3RyaW5nXHJcbiAgYWRkcmVzczogYW55XHJcbiAgYXNzaWdubWVudF9oaXN0b3J5OiBhbnlbXVxyXG4gIGRpcGxvbWFzOiBzdHJpbmdbXVxyXG4gIG5vdGVzOiBhbnlbXVxyXG4gIGNyZWF0ZWRfYXQ6IHN0cmluZ1xyXG4gIHVwZGF0ZWRfYXQ6IHN0cmluZ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5uZWRUcmlwIHtcclxuICBpZDogc3RyaW5nXHJcbiAgc2hpcF9pZDogc3RyaW5nXHJcbiAgdHJpcF9uYW1lOiBzdHJpbmdcclxuICBzdGFydF9kYXRlOiBzdHJpbmdcclxuICBlbmRfZGF0ZTogc3RyaW5nXHJcbiAgdHJpcF9mcm9tOiBzdHJpbmdcclxuICB0cmlwX3RvOiBzdHJpbmdcclxuICBhZmxvc3Nlcl9pZD86IHN0cmluZ1xyXG4gIHN0YXR1czogJ2dlcGxhbmQnIHwgJ2FjdGllZicgfCAndm9sdG9vaWQnXHJcbiAgbm90ZXM/OiBzdHJpbmdcclxuICBjcmVhdGVkX2F0OiBzdHJpbmdcclxuICB1cGRhdGVkX2F0OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTaWNrTGVhdmUge1xyXG4gIGlkOiBzdHJpbmdcclxuICBjcmV3X21lbWJlcl9pZDogc3RyaW5nXHJcbiAgc3RhcnRfZGF0ZTogc3RyaW5nXHJcbiAgZW5kX2RhdGU/OiBzdHJpbmdcclxuICBjZXJ0aWZpY2F0ZV92YWxpZF91bnRpbD86IHN0cmluZ1xyXG4gIG5vdGVzOiBzdHJpbmdcclxuICBzdGF0dXM6ICdhY3RpZWYnIHwgJ3dhY2h0LW9wLWJyaWVmamUnIHwgJ2FmZ2Vyb25kJ1xyXG4gIHBhaWRfYnk6IHN0cmluZ1xyXG4gIHNhbGFyeV9wZXJjZW50YWdlOiBudW1iZXJcclxuICBjcmVhdGVkX2F0OiBzdHJpbmdcclxuICB1cGRhdGVkX2F0OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdGFuZEJhY2tSZWNvcmQge1xyXG4gIGlkOiBzdHJpbmdcclxuICBjcmV3X21lbWJlcl9pZDogc3RyaW5nXHJcbiAgc3RhcnRfZGF0ZTogc3RyaW5nXHJcbiAgZW5kX2RhdGU6IHN0cmluZ1xyXG4gIGRheXNfY291bnQ6IG51bWJlclxyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmdcclxuICByZWFzb24/OiBzdHJpbmdcclxuICBub3Rlcz86IHN0cmluZ1xyXG4gIHN0YW5kX2JhY2tfZGF5c19yZXF1aXJlZDogbnVtYmVyXHJcbiAgc3RhbmRfYmFja19kYXlzX2NvbXBsZXRlZDogbnVtYmVyXHJcbiAgc3RhbmRfYmFja19kYXlzX3JlbWFpbmluZzogbnVtYmVyXHJcbiAgc3RhbmRfYmFja19zdGF0dXM6ICdvcGVuc3RhYW5kJyB8ICd2b2x0b29pZCdcclxuICBzdGFuZF9iYWNrX2hpc3Rvcnk6IGFueVtdXHJcbiAgY3JlYXRlZF9hdDogc3RyaW5nXHJcbiAgdXBkYXRlZF9hdDogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9hbiB7XHJcbiAgaWQ6IHN0cmluZ1xyXG4gIGNyZXdfaWQ6IHN0cmluZ1xyXG4gIG5hbWU6IHN0cmluZ1xyXG4gIHBlcmlvZDogc3RyaW5nXHJcbiAgYW1vdW50OiBudW1iZXJcclxuICByZWFzb246IHN0cmluZ1xyXG4gIHN0YXR1czogJ29wZW4nIHwgJ3ZvbHRvb2lkJ1xyXG4gIGNyZWF0ZWRfYXQ6IHN0cmluZ1xyXG4gIHVwZGF0ZWRfYXQ6IHN0cmluZ1xyXG4gIGNvbXBsZXRlZF9hdD86IHN0cmluZ1xyXG4gIG5vdGVzPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVHJpcCB7XHJcbiAgaWQ6IHN0cmluZ1xyXG4gIHRyaXBfbmFtZTogc3RyaW5nXHJcbiAgc2hpcF9pZDogc3RyaW5nXHJcbiAgc3RhcnRfZGF0ZTogc3RyaW5nXHJcbiAgZW5kX2RhdGU/OiBzdHJpbmdcclxuICB0cmlwX2Zyb206IHN0cmluZ1xyXG4gIHRyaXBfdG86IHN0cmluZ1xyXG4gIG5vdGVzPzogc3RyaW5nXHJcbiAgXHJcbiAgLy8gTmV3IHdvcmtmbG93IGZpZWxkc1xyXG4gIHN0YXR1czogJ2dlcGxhbmQnIHwgJ2luZ2VkZWVsZCcgfCAnYWN0aWVmJyB8ICd2b2x0b29pZCdcclxuICBhZmxvc3Nlcl9pZD86IHN0cmluZ1xyXG4gIFxyXG4gIC8vIEFjdHVhbCBib2FyZGluZy9sZWF2aW5nIHRpbWVzXHJcbiAgc3RhcnRfZGF0dW0/OiBzdHJpbmdcclxuICBzdGFydF90aWpkPzogc3RyaW5nXHJcbiAgZWluZF9kYXR1bT86IHN0cmluZ1xyXG4gIGVpbmRfdGlqZD86IHN0cmluZ1xyXG4gIFxyXG4gIC8vIEFmbG9zc2VyIGZlZWRiYWNrXHJcbiAgYWZsb3NzZXJfb3BtZXJraW5nZW4/OiBzdHJpbmdcclxuICBcclxuICAvLyBUaW1lc3RhbXBzXHJcbiAgY3JlYXRlZF9hdDogc3RyaW5nXHJcbiAgdXBkYXRlZF9hdDogc3RyaW5nXHJcbn0gIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlVXJsIiwic3VwYWJhc2VBbm9uS2V5Iiwic3VwYWJhc2UiLCJjb25zb2xlIiwibG9nIiwiZXJyb3IiLCJmcm9tIiwidGFibGUiLCJzZWxlY3QiLCJkYXRhIiwiaW5zZXJ0IiwidXBkYXRlIiwiZGVsZXRlIiwiZXEiLCJzaW5nbGUiLCJvcmRlciIsImxpbWl0Iiwibm90IiwiYXV0aCIsImdldFNlc3Npb24iLCJzZXNzaW9uIiwiY2hhbm5lbCIsIm9uIiwic3Vic2NyaWJlIiwidW5zdWJzY3JpYmUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabase.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcheck-probation%2Froute&page=%2Fapi%2Fcheck-probation%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-probation%2Froute.ts&appDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcheck-probation%2Froute&page=%2Fapi%2Fcheck-probation%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-probation%2Froute.ts&appDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Dev_bamalite_hr_system_Bemanningslijst_app_api_check_probation_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/check-probation/route.ts */ \"(rsc)/./app/api/check-probation/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/check-probation/route\",\n        pathname: \"/api/check-probation\",\n        filename: \"route\",\n        bundlePath: \"app/api/check-probation/route\"\n    },\n    resolvedPagePath: \"C:\\\\Dev\\\\bamalite-hr-system Bemanningslijst\\\\app\\\\api\\\\check-probation\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Dev_bamalite_hr_system_Bemanningslijst_app_api_check_probation_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZjaGVjay1wcm9iYXRpb24lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmNoZWNrLXByb2JhdGlvbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmNoZWNrLXByb2JhdGlvbiUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDRGV2JTVDYmFtYWxpdGUtaHItc3lzdGVtJTIwQmVtYW5uaW5nc2xpanN0JTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDRGV2JTVDYmFtYWxpdGUtaHItc3lzdGVtJTIwQmVtYW5uaW5nc2xpanN0JmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUNnQztBQUM3RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiQzpcXFxcRGV2XFxcXGJhbWFsaXRlLWhyLXN5c3RlbSBCZW1hbm5pbmdzbGlqc3RcXFxcYXBwXFxcXGFwaVxcXFxjaGVjay1wcm9iYXRpb25cXFxccm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2NoZWNrLXByb2JhdGlvbi9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2NoZWNrLXByb2JhdGlvblwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvY2hlY2stcHJvYmF0aW9uL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiQzpcXFxcRGV2XFxcXGJhbWFsaXRlLWhyLXN5c3RlbSBCZW1hbm5pbmdzbGlqc3RcXFxcYXBwXFxcXGFwaVxcXFxjaGVjay1wcm9iYXRpb25cXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcheck-probation%2Froute&page=%2Fapi%2Fcheck-probation%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-probation%2Froute.ts&appDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "?32c4":
/*!****************************!*\
  !*** bufferutil (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?66e9":
/*!********************************!*\
  !*** utf-8-validate (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "dns":
/*!**********************!*\
  !*** external "dns" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("dns");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/ws","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions","vendor-chunks/isows","vendor-chunks/nodemailer"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fcheck-probation%2Froute&page=%2Fapi%2Fcheck-probation%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-probation%2Froute.ts&appDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CDev%5Cbamalite-hr-system%20Bemanningslijst&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();