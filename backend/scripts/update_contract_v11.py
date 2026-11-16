"""Build the additive v1.1 contract from the checked-in v1 baseline."""

import copy
import json
import os
import sys
from secrets import token_urlsafe
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "docs/api/openapi.json"


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def obj(properties, required=None):
    return {"type": "object", "properties": properties, "required": list(properties) if required is None else required,
            "additionalProperties": False}


def array(item):
    return {"type": "array", "items": item}


def build():
    spec = json.loads((TARGET.parent / "openapi-v1.json").read_text(encoding="utf-8"))
    schemas = spec["components"]["schemas"]
    spec["info"]["version"] = "1.1.0"
    spec["info"]["description"] = (
        "Hợp đồng API v1.1 – PB-51 / T0694D7. Bổ sung thống kê, required-score, grade-scale, import và Admin. "
        "What-if và Export xử lý tại FE, không có endpoint. x-implementation phân biệt implemented với contract-only; "
        "chỉ nối API implemented. Thông báo và nội dung chốt xem docs/api/CHANGELOG-v1.1.md. "
        "Mọi dữ liệu cá nhân được giới hạn theo tài khoản từ Bearer token, không nhận userId từ FE."
    )
    spec["servers"] = [{"url": "/api/v1", "description": "Cùng origin qua Nginx; local API http://localhost:8000"}]
    for item in spec["paths"].values():
        for method, operation in item.items():
            if method in {"get", "post", "put", "patch", "delete"}:
                operation["x-implementation"] = "contract-only"
    for path in ["/auth/login", "/auth/refresh", "/auth/logout", "/gpa/cumulative", "/semesters/{semesterId}/gpa"]:
        for operation in spec["paths"][path].values():
            if isinstance(operation, dict):
                operation["x-implementation"] = "implemented"

    number = {"type": "number", "minimum": 0, "maximum": 4, "nullable": True}
    integer = {"type": "integer", "minimum": 0}
    string = {"type": "string"}
    schemas["StatisticsSummary"] = obj({
        "gpa4": number, "includedCredits": integer, "passedCredits": integer,
        "ranking": {"type": "string", "nullable": True},
        "average10": {"type": "number", "minimum": 0, "maximum": 10, "nullable": True},
        "totalCourses": integer, "completedCourses": integer, "passedCourses": integer,
        "retakePolicy": {"type": "string", "enum": ["HIGHEST_GRADE_BY_COURSE_CODE"]},
    })
    semester = copy.deepcopy(schemas["SemesterGpa"])
    semester["properties"].update({"name": string, "academicYear": string,
                                    "startDate": {"type": "string", "format": "date"}, "cumulativeGpa4": number})
    semester["required"] = list(semester["properties"])
    schemas["StatisticsSemester"] = semester
    schemas["StatisticsSemesters"] = obj({"items": array(ref("StatisticsSemester"))})
    schemas["Distribution"] = obj({
        "items": array(obj({"grade": string, "count": integer})), "totalCourses": integer,
        "countingPolicy": {"type": "string", "enum": ["ALL_COMPLETED_ATTEMPTS"]},
    })
    schemas["Dashboard"] = obj({"summary": ref("StatisticsSummary"),
                                "semesters": ref("StatisticsSemesters"), "distribution": ref("Distribution")})
    scale_item = obj({"letter": {"type": "string", "minLength": 1, "maxLength": 2},
                      "min10": {"type": "number", "minimum": 0, "maximum": 10},
                      "max10": {"type": "number", "minimum": 0, "maximum": 10},
                      "grade4": {"type": "number", "minimum": 0, "maximum": 4}})
    schemas["GradeScale"] = obj({"items": {**array(scale_item), "minItems": 1, "maxItems": 20}})
    schemas["RequiredScore"] = obj({
        "targetGpa": {"type": "number", "minimum": 0, "maximum": 4},
        "remainingCredits": {"type": "integer", "minimum": 1}, "includedCredits": integer,
        "weightedPoints": {"type": "number", "minimum": 0},
        "requiredScore4": {"type": "number", "description": "Không clamp vào 0–4; trả giá trị thực để giải thích tính khả thi."},
        "status": {"type": "string", "enum": ["FEASIBLE", "IMPOSSIBLE", "ALREADY_ACHIEVED"]},
    })
    row = obj({
        "row": {"type": "integer", "minimum": 2, "description": "Số dòng CSV gốc, tính cả header."},
        "semesterId": {"type": "integer", "minimum": 1, "nullable": True},
        "semester": ref("SemesterWrite"), "courseCode": {"type": "string", "minLength": 1, "maxLength": 50},
        "courseName": {"type": "string", "minLength": 1, "maxLength": 150},
        "credits": {"type": "integer", "minimum": 1},
        "category": {"type": "string", "enum": ["đại cương", "cơ sở ngành", "chuyên ngành"]},
        "componentName": {"type": "string", "minLength": 1, "maxLength": 150},
        "weightPercent": {"type": "number", "exclusiveMinimum": True, "minimum": 0, "maximum": 100},
        "score": {"type": "number", "minimum": 0, "maximum": 10},
    }, ["row", "courseCode", "courseName", "credits", "category", "componentName", "weightPercent", "score"])
    row["description"] = "Cung cấp semesterId của chính mình HOẶC semester (đủ tên, năm, ngày), không gửi cả hai."
    row["oneOf"] = [{"required": ["semesterId"], "not": {"required": ["semester"]}},
                    {"required": ["semester"], "not": {"required": ["semesterId"]}}]
    row["properties"]["semesterId"].pop("nullable")
    schemas["ImportGradesRequest"] = obj({
        "rows": {**array(row), "minItems": 1, "maxItems": 1000},
        "allowCreate": {"type": "boolean", "description": "FE xác nhận tạo học kỳ/môn chưa có."},
        "duplicatePolicy": {"type": "string", "enum": ["UPSERT"]},
    })
    schemas["ImportResult"] = obj({"processedRows": integer, "createdSemesters": integer,
                                   "createdCourses": integer, "updatedComponents": integer})
    schemas["AdminUserStatus"] = obj({"isActive": {"type": "boolean"}})
    schemas["PageMeta"] = obj({"page": {"type": "integer", "minimum": 1},
                               "pageSize": {"type": "integer", "minimum": 1, "maximum": 100},
                               "totalItems": integer, "totalPages": integer})
    schemas["AdminUsers"] = obj({"items": array(ref("UserPublic")), "meta": ref("PageMeta")})
    schemas["AdminStatistics"] = obj({"totalUsers": integer, "activeUsers": integer, "totalSemesters": integer,
                                      "totalCourses": integer})
    schemas["AuditEntry"] = obj({"id": integer, "actorId": integer, "targetUserId": integer,
                                 "action": {"type": "string", "enum": ["LOCK_USER", "UNLOCK_USER"]},
                                 "timestamp": {"type": "string", "format": "date-time"}})
    schemas["AuditPage"] = obj({"items": array(ref("AuditEntry")), "meta": ref("PageMeta")})
    schemas["Health"] = obj({"status": {"type": "string", "enum": ["ok"]},
                             "database": {"type": "string", "enum": ["ok"]}})
    schemas["ErrorDetail"]["properties"]["row"] = {"type": "integer", "minimum": 2}
    # Errors generated by the existing backend use code + details, with message at envelope level.
    schemas["ErrorObject"]["required"] = ["code", "details"]
    error_codes = schemas["ErrorObject"]["properties"]["code"].get("enum")
    if error_codes is not None:
        for code in ["INVALID_TOKEN", "TOO_MANY_ATTEMPTS", "SERVICE_UNAVAILABLE", "IMPORT_INVALID_ROWS",
                     "IMPORT_FILE_INVALID", "GRADE_SCALE_INVALID"]:
            if code not in error_codes:
                error_codes.append(code)

    for name in ["StatisticsSummary", "StatisticsSemesters", "Distribution", "Dashboard", "GradeScale", "RequiredScore",
                 "ImportResult", "AdminUsers", "AdminStatistics", "AuditPage", "Health"]:
        envelope = copy.deepcopy(schemas["UserResponse"])
        envelope["properties"]["data"] = ref(name)
        schemas[name + "Response"] = envelope

    def envelope(data, path, status=200):
        return dict(success=True, statusCode=status, message="Thành công", data=data, error=None,
                    timestamp="2026-11-17T09:00:00+07:00", path="/api/v1" + path)

    def operation(path, method, name, data_schema, description, example, body=None, parameters=None,
                  implemented=False, tag="Statistics", errors=(401, 403, 500), status=200):
        result = {"tags": [tag], "summary": name, "operationId": method + data_schema + path.replace("/", "_").replace("{", "").replace("}", ""),
                  "description": description, "x-task-id": "T0694D7", "x-implementation": "implemented" if implemented else "contract-only",
                  "responses": {str(status): {"description": "Thành công", "content": {"application/json": {
                      "schema": ref(data_schema + "Response"), "example": envelope(example, path, status)}}}}}
        for code in errors:
            result["responses"][str(code)] = {"$ref": f"#/components/responses/HTTP{code}"}
        if body:
            result["requestBody"] = {"required": True, "content": {"application/json": {"schema": ref(body)}}}
        if parameters:
            result["parameters"] = parameters
        spec["paths"].setdefault(path, {})[method] = result
        return result

    summary_example = dict(gpa4=2.4, includedCredits=5, passedCredits=3, ranking="Trung bình", average10=6.96,
                           totalCourses=3, completedCourses=2, passedCourses=1, retakePolicy="HIGHEST_GRADE_BY_COURSE_CODE")
    sem_example = {"items": [dict(semesterId=1, name="HK1", academicYear="2026-2027", startDate="2026-09-01",
                                 gpa4=2.4, includedCredits=5, passedCredits=3, ranking="Trung bình", cumulativeGpa4=2.4)]}
    dist_example = {"items": [{"grade": grade, "count": int(grade in ("A", "F"))}
                              for grade in ["A", "B+", "B", "C+", "C", "D+", "D", "F"]],
                    "totalCourses": 2, "countingPolicy": "ALL_COMPLETED_ATTEMPTS"}
    operation("/statistics/summary", "get", "Tổng hợp Dashboard (PB-20 / T0694DB)", "StatisticsSummary",
              "GPA và average10 có trọng số tín chỉ; học lại chọn điểm cao nhất (hệ 4, hệ 10, ID nhỏ nhất). "
              "passedCredits chỉ tính môn >= 4.0. Không dữ liệu: GPA/average10/ranking=null, các bộ đếm=0. "
              "totalCourses đếm mọi lần học; completedCourses/passedCourses đếm sau gộp mã môn.", summary_example, implemented=True)
    operation("/statistics/semesters", "get", "GPA theo kỳ (PB-21 / T0694DC)", "StatisticsSemesters",
              "Sắp xếp startDate, semesterId tăng dần. GPA kỳ giữ mọi lần học trong kỳ; cumulativeGpa4 gộp học lại "
              "trong các kỳ đến thời điểm đó. GPA làm tròn HALF_UP 2 chữ số trước xếp loại. Kỳ rỗng trả GPA null; "
              "không có kỳ trả items=[].", sem_example, implemented=True)
    operation("/statistics/distribution", "get", "Phân bố điểm chữ (PB-21 / T0694DC)", "Distribution",
              "Đếm mọi lần học đủ điểm, bao gồm F và học lại, để khớp danh sách môn. Tra grade10 đã làm tròn 1 chữ số "
              "vào grade_scale trong DB. Trả đủ các mức theo min10 giảm dần, cả mức có count=0. Không đủ điểm: totalCourses=0.",
              dist_example, implemented=True)
    operation("/statistics/dashboard", "get", "Dashboard một request (PB-20 / PB-21)", "Dashboard",
              "Gộp summary, semesters, distribution; cùng một lần đọc dữ liệu. FE dùng để giảm số request. "
              "FE hiển thị loading/rỗng/lỗi, không thay lỗi bằng dữ liệu mẫu. Chỉ tiêu Dashboard <2s đo tại FE theo PB-39.",
              dict(summary=summary_example, semesters=sem_example, distribution=dist_example), implemented=True)
    operation("/grade-scale", "get", "Đọc bảng quy đổi (BR-04)", "GradeScale",
              "Yêu cầu Bearer token. Đọc DB; FE dùng bảng này cho What-if, không hard-code các mốc.",
              {"items": [{"letter": "A", "min10": 8.5, "max10": 10, "grade4": 4}]}, implemented=True, tag="Grade scale")
    operation("/goals/required-score", "get", "Điểm trung bình cần đạt cho mục tiêu hiện tại", "RequiredScore",
              "Đọc mục tiêu đã lưu, không nhận body/query. (targetGpa × (includedCredits + remainingCredits) − weightedPoints) "
              "/ remainingCredits; weightedPoints chưa làm tròn, cùng chính sách học lại với GPA. >4 IMPOSSIBLE; "
              "<=0 ALREADY_ACHIEVED; còn lại FEASIBLE. Không có điểm dùng 0 tín chỉ/0 tổng điểm; chưa có goal trả 404.",
              dict(targetGpa=3, remainingCredits=5, includedCredits=5, weightedPoints=12, requiredScore4=3.6, status="FEASIBLE"),
              tag="Goal", errors=(401, 403, 404, 500))
    imported = operation("/import/grades", "post", "Lưu hàng loạt sau xem trước CSV", "ImportResult",
                         "FE đọc CSV <=2MB và chỉ gửi dòng hợp lệ sau xác nhận. JSON request <=2MiB, 1–1000 dòng. "
                         "BE kiểm tra lại tất cả dòng, owner, metadata nhất quán, tổng trọng số mỗi môn=100%; "
                         "một transaction: lỗi bất kỳ rollback toàn bộ. UPSERT theo (owner, semesterId, mã môn trim/uppercase, "
                         "tên thành phần trim); cập nhật thành phần trùng, giữ thành phần khác; tổng trọng số sau hợp nhất phải=100. "
                         "Hai dòng trùng khóa trong payload là lỗi. semester mới phải đủ ngày/năm; allowCreate=false và chưa tồn tại trả 404. "
                         "Thông báo lỗi có details[{row,field,reason}]. Không có upload file hay endpoint export.",
                         dict(processedRows=1, createdSemesters=0, createdCourses=1, updatedComponents=1),
                         body="ImportGradesRequest", tag="Import", errors=(400, 401, 403, 404, 413, 500))
    imported["requestBody"]["content"]["application/json"]["example"] = {
        "allowCreate": True, "duplicatePolicy": "UPSERT", "rows": [{"row": 2, "semesterId": 1, "courseCode": "CS1",
        "courseName": "Lập trình", "credits": 3, "category": "cơ sở ngành", "componentName": "Tổng kết", "weightPercent": 100, "score": 8.5}]}
    imported["responses"]["400"] = {"description": "IMPORT_INVALID_ROWS: không lưu dòng nào khi có lỗi; IMPORT_FILE_INVALID: số dòng sai giới hạn.",
        "content": {"application/json": {"schema": ref("ErrorResponse"), "example": {
            **envelope(None, "/import/grades", 400), "success": False, "message": "Có dòng không hợp lệ, không lưu dữ liệu.",
            "error": {"code": "IMPORT_INVALID_ROWS", "details": [{"row": 2, "field": "score", "reason": "Điểm phải trong khoảng 0–10"}]}}}}}
    params = [{"name": "page", "in": "query", "schema": {"type": "integer", "minimum": 1, "default": 1}},
              {"name": "pageSize", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}]
    operation("/admin/users", "get", "Danh sách tài khoản (ADMIN)", "AdminUsers",
              "Chỉ ADMIN; q tìm email/họ tên không phân biệt hoa thường; isActive lọc trạng thái. Sắp id tăng dần; "
              "không trả password_hash/token. totalPages=ceil(totalItems/pageSize), bằng 0 khi rỗng.",
              {"items": [], "meta": dict(page=1, pageSize=20, totalItems=0, totalPages=0)}, tag="Admin",
              parameters=params + [{"name": "q", "in": "query", "schema": {"type": "string", "maxLength": 150}},
                                   {"name": "isActive", "in": "query", "schema": {"type": "boolean"}}], errors=(400, 401, 403, 500))
    user_param = [{"name": "userId", "in": "path", "required": True, "schema": {"type": "integer", "minimum": 1}}]
    user_result = operation("/admin/users/{userId}/status", "patch", "Khóa/mở tài khoản (ADMIN)", "User",
                           "Chỉ ADMIN; không tự khóa chính mình (403). Khóa thu hồi mọi phiên ngay; mở không khôi phục token cũ. "
                           "Ghi audit actorId/targetUserId/action/timestamp trong cùng transaction. Gửi lại cùng trạng thái là idempotent, không thêm audit.",
                           dict(id=2, email="sv@example.com", fullName="Sinh viên", role="STUDENT", isActive=False),
                           body="AdminUserStatus", parameters=user_param, tag="Admin", errors=(400, 401, 403, 404, 500))
    user_result["requestBody"]["content"]["application/json"]["example"] = {"isActive": False}
    scale_put = operation("/admin/grade-scale", "put", "Thay toàn bộ bảng quy đổi (ADMIN)", "GradeScale",
                         "Chỉ ADMIN. Các khoảng bao phủ 0.0–10.0 với bước 0.1, không chồng lấn/khe hở, letter duy nhất, "
                         "grade4 trong 0–4. Bảo toàn ngưỡng đạt 4.0, F dưới 4.0 có hệ 4=0. Sai trả 400 GRADE_SCALE_INVALID. "
                         "Cập nhật thang và tính lại grade4 của mọi môn đã đủ điểm trong một transaction; lỗi rollback toàn bộ.",
                         {"items": [{"letter": "A", "min10": 8.5, "max10": 10, "grade4": 4}]},
                         body="GradeScale", tag="Admin", errors=(400, 401, 403, 500))
    scale_put["requestBody"]["content"]["application/json"]["example"] = {"items": [
        dict(letter=letter, min10=low, max10=high, grade4=grade) for letter, low, high, grade in [
            ("A",8.5,10,4),("B+",8,8.4,3.5),("B",7,7.9,3),("C+",6.5,6.9,2.5),
            ("C",5.5,6.4,2),("D+",5,5.4,1.5),("D",4,4.9,1),("F",0,3.9,0)]]}
    scale_put["responses"]["400"] = {"description": "GRADE_SCALE_INVALID nếu các khoảng chồng lấn/khe hở hoặc sai ngưỡng; VALIDATION_ERROR nếu sai kiểu dữ liệu.",
        "content": {"application/json": {"schema": ref("ErrorResponse"), "example": {
            **envelope(None, "/admin/grade-scale", 400), "success": False, "message": "Bảng quy đổi không hợp lệ.",
            "error": {"code": "GRADE_SCALE_INVALID", "details": [{"field": "items", "reason": "Các khoảng phải phủ kín 0.0–10.0"}]}}}}}
    operation("/admin/statistics", "get", "Thống kê toàn hệ thống (ADMIN)", "AdminStatistics",
              "Chỉ ADMIN; đếm tài khoản, tài khoản active, học kỳ và mọi lần học; không trả điểm cá nhân.",
              dict(totalUsers=10, activeUsers=9, totalSemesters=20, totalCourses=100), tag="Admin")
    operation("/admin/audit-logs", "get", "Lịch sử khóa/mở tài khoản (ADMIN)", "AuditPage",
              "Chỉ ADMIN. Sắp timestamp DESC, id DESC. Không có bản ghi trả items=[].",
              {"items": [], "meta": dict(page=1, pageSize=20, totalItems=0, totalPages=0)},
              tag="Admin", parameters=params, errors=(400, 401, 403, 500))
    health = operation("/health", "get", "Readiness cho staging", "Health", "Không yêu cầu token; SELECT 1 kiểm tra DB. "
                       "DB lỗi trả 503 SERVICE_UNAVAILABLE; không lộ cấu hình kết nối.",
                       {"status": "ok", "database": "ok"}, implemented=True, tag="Health", errors=(503,))
    health["security"] = []
    spec["paths"]["/auth/me"] = {"get": {**copy.deepcopy(spec["paths"]["/goals"]["get"]),
        "tags": ["Auth"], "summary": "Thông tin tài khoản hiện tại", "operationId": "getMe",
        "description": "Đọc tài khoản từ phiên đăng nhập.", "x-implementation": "implemented"}}
    spec["paths"]["/auth/me"]["get"]["responses"]["200"]["content"]["application/json"]["schema"] = ref("UserResponse")
    for status, code, message in [(413, "IMPORT_FILE_INVALID", "Payload vượt 2 MiB"),
                                  (503, "SERVICE_UNAVAILABLE", "Cơ sở dữ liệu chưa sẵn sàng")]:
        spec["components"]["responses"][f"HTTP{status}"] = {"description": message, "content": {"application/json": {
            "schema": ref("ErrorResponse"), "example": {**envelope(None, "/health" if status == 503 else "/import/grades", status), "success": False,
            "message": message, "error": {"code": code, "details": []}}}}}
    for tag in ["Statistics", "Grade scale", "Import", "Admin", "Health"]:
        if tag not in [item["name"] for item in spec["tags"]]:
            spec["tags"].append({"name": tag})
    merge_runtime(spec)
    TARGET.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def merge_runtime(spec):
    """Reconcile the old draft with the merged ORM API without changing its wire format."""
    from fastapi.openapi.utils import get_openapi
    from app.main import app
    from app.schemas.course import CourseResponse
    from app.schemas.semester import SemesterResponse
    from app.schemas.grade_scale import GradeScaleResponse

    def convert(node):
        if isinstance(node, list):
            return [convert(child) for child in node]
        if not isinstance(node, dict):
            return node
        node = {key: convert(value) for key, value in node.items()}
        if "$ref" in node and node["$ref"].startswith("#/components/schemas/"):
            node["$ref"] = node["$ref"].replace("#/components/schemas/", "#/components/schemas/Live")
        if "anyOf" in node and any(child.get("type") == "null" for child in node["anyOf"]):
            rest = [child for child in node.pop("anyOf") if child.get("type") != "null"]
            node.update(rest[0] if len(rest) == 1 else {"anyOf": rest})
            node["nullable"] = True
        for bound in ["Minimum", "Maximum"]:
            key = "exclusive" + bound
            if key in node and not isinstance(node[key], bool):
                node[bound.lower()] = node[key]
                node[key] = True
        node.pop("const", None)
        return node

    live = get_openapi(title=app.title, version="1.1.0", openapi_version="3.0.3", routes=app.routes)
    schemas = spec["components"]["schemas"]
    for name, schema in live.get("components", {}).get("schemas", {}).items():
        schemas["Live" + name] = convert(schema)
    for model in [CourseResponse, SemesterResponse, GradeScaleResponse]:
        schemas["Live" + model.__name__] = convert(model.model_json_schema(mode="serialization"))
    draft_paths = spec["paths"]
    spec["paths"] = {path: value for path, value in draft_paths.items()
                     if path == "/goals" or path.startswith(("/admin/", "/import/", "/goals/required"))}
    for full_path, methods in live["paths"].items():
        if not full_path.startswith("/api/v1"):
            continue
        path = full_path.removeprefix("/api/v1")
        if path.startswith("/statistics/") or path in {"/health", "/auth/me"}:
            spec["paths"][path] = draft_paths[path]
            continue
        spec["paths"][path] = convert(methods)
        for method, operation in spec["paths"][path].items():
            operation["x-implementation"] = "implemented"
            operation["responses"].pop("422", None)
            for code in [400, 401, 403, 404, 500]:
                operation["responses"][str(code)] = {"$ref": f"#/components/responses/HTTP{code}"}
            operation["security"] = [] if path in {"/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/grade-scale"} else [{"BearerAuth": []}]
            data_schema = None
            if path == "/grade-scale":
                data_schema = array(ref("LiveGradeScaleResponse"))
                operation["description"] = "Công khai, đọc bảng quy đổi DB; data là mảng {id,minScore,maxScore,letter,gpa4}. FE dùng trực tiếp, không hard-code."
                operation["responses"] = {"200": operation["responses"]["200"], "500": operation["responses"]["500"]}
            elif path.startswith("/auth/"):
                data_schema = ref("TokenPair") if path.endswith(("login", "refresh")) else {"type": "object", "nullable": True}
                if path.endswith("register"):
                    data_schema = obj({"id": {"type": "integer"}, "email": {"type": "string"}, "fullName": {"type": "string"}})
            elif path.endswith("/gpa"):
                data_schema = ref("SemesterGpa")
            elif path == "/gpa/cumulative":
                data_schema = ref("CumulativeGpa")
            elif "grade-components" in path or path.endswith("/scores"):
                data_schema = ref("CurrentGradeConfiguration")
            elif method != "delete" and not path.endswith("deletion-preview"):
                name = "LiveCourseResponse" if "/courses" in path else "LiveSemesterResponse"
                data_schema = array(ref(name)) if method == "get" and (path == "/semesters" or path.endswith("/courses")) else ref(name)
            elif path.endswith("deletion-preview"):
                data_schema = obj({"gradeComponentsToDelete": {"type": "integer", "minimum": 0}})
            else:
                props = {"deletedGradeComponents": {"type": "integer", "minimum": 0}}
                if path.startswith("/semesters"):
                    props["deletedCourses"] = {"type": "integer", "minimum": 0}
                data_schema = obj(props)
            status = "201" if method == "post" and path in {"/auth/register"} or method == "post" and path.endswith("/courses") or method == "post" and path == "/semesters" or method == "post" and path.endswith("grade-components") else "200"
            envelope = copy.deepcopy(schemas["UserResponse"])
            envelope["properties"]["data"] = data_schema
            envelope["properties"]["statusCode"]["example"] = int(status)
            operation["responses"][status] = {"description": "Thành công", "content": {"application/json": {"schema": envelope}}}
    num = {"type": "number", "nullable": True}
    boolean = {"type": "boolean"}
    schemas["CurrentGradeConfiguration"] = obj({
        "components": array(obj({"id": {"type": "integer"}, "courseId": {"type": "integer"}, "name": {"type": "string"},
                                 "weightPercent": {"type": "number"}, "score": num})),
        "totalWeightPercent": {"type": "number"}, "isComplete": boolean, "temporaryCourseScore": num,
        "hasAllScores": boolean, "canCalculateCourseGrade": boolean, "courseGrade10": num,
        "calculationMessage": {"type": "string", "nullable": True}, "letterGrade": {"type": "string", "nullable": True},
        "grade4": num, "isPassed": {"type": "boolean", "nullable": True},
    })
    # The draft import uses the current semester fields and current category enum.
    import_row = schemas["ImportGradesRequest"]["properties"]["rows"]["items"]
    import_row["properties"]["semester"] = ref("LiveSemesterCreate")
    import_row["properties"]["category"]["enum"] = ["GENERAL", "FOUNDATION", "SPECIALIZED"]
    draft_paths["/import/grades"]["post"]["requestBody"]["content"]["application/json"]["example"]["rows"][0]["category"] = "FOUNDATION"


if __name__ == "__main__":
    # Import the app for schema generation with a disposable in-memory engine, never the real configured DB.
    sys.path.insert(0, str(ROOT / "backend"))
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["SECRET_KEY"] = token_urlsafe(32)
    build()
