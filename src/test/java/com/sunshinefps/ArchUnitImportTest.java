package com.sunshinefps;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class ArchUnitImportTest {

    @Test
    void 扫描结果要包含启动类和四个_Facade() {
        var classes =
                new ClassFileImporter()
                        .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                        .importPackages("com.sunshinefps");

        assertThat(classes)
                .as("ArchUnit 扫到 0 个类说明字节码读不了，架构规则全部形同虚设")
                .extracting(JavaClass::getSimpleName)
                .contains(
                        "SunshineFpsApplication",
                        "IdentityFacade",
                        "CatalogFacade",
                        "TradeFacade",
                        "ContentFacade");
    }
}
